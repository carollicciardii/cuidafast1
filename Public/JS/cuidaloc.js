// Public/JS/cuidaloc.js
// Página do Cuidador — publica posição no Firestore (se usar) e no endpoint server-side (via /api/auth/localizacao/cuidador)

(function () {
  const map = L.map('map').setView([-23.5505, -46.6333], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const statusEl = document.getElementById('status');

  const km = (m) => (m / 1000).toFixed(2);
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const toRad = (v) => v * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // URL params / user id
  const params = new URLSearchParams(location.search);
  const usuarioId = Number(localStorage.getItem('usuario_id')) || Number(params.get('id')) || null;
  const view = (params.get('view') || '').toLowerCase();
  let cuidadorUid = null;
  let clienteUid = null;

  let cuidadorMarker = null;
  let clienteMarker = null;

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  function upsertCuidadorMarker(lat, lng) {
    const icon = L.divIcon({
      className: '',
      html: '<i class="ph-user ph-bold ph-icon" style="font-size:28px;color:#0d6efd"></i>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    if (cuidadorMarker) {
      cuidadorMarker.setLatLng([lat, lng]);
    } else {
      cuidadorMarker = L.marker([lat, lng], { icon }).addTo(map).bindPopup('Minha posição');
    }
  }

  function upsertClienteMarker(lat, lng) {
    const icon = L.divIcon({
      className: '',
      html: '<i class="ph-house ph-bold ph-icon" style="font-size:30px;color:#333"></i>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    if (clienteMarker) {
      clienteMarker.setLatLng([lat, lng]);
    } else {
      clienteMarker = L.marker([lat, lng], { icon }).addTo(map).bindPopup('Casa do cliente');
    }
  }

  // authFetch: utiliza Firebase token via firebase.auth().currentUser
  async function authFetch(url, options = {}, retry = true) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Não autenticado');
    const token = await user.getIdToken();
    const res = await fetch(url, { ...options, headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}`, ...(options.headers||{}) } });
    if (res.status === 401 && retry) {
      const fresh = await user.getIdToken(true);
      return fetch(url, { ...options, headers: { 'Content-Type':'application/json', Authorization: `Bearer ${fresh}`, ...(options.headers||{}) } });
    }
    return res;
  }

  // Envia para backend (via /api/auth/localizacao/cuidador)
  async function postarLocalizacaoServer(lat, lng) {
    try {
      // autenticação via Firebase token (authFetch) garante que backend consiga verificar
      const res = await authFetch('/api/auth/localizacao/cuidador', {
        method: 'POST',
        body: JSON.stringify({ lat: Number(lat), lng: Number(lng), usuario_id: usuarioId })
      });
      if (!res.ok) {
        const t = await res.text().catch(()=>null);
        console.warn('postarLocalizacaoServer falhou', res.status, t);
      }
    } catch (e) {
      console.warn('Falha ao enviar localização para o servidor:', e.message || e);
    }
  }

  // Escreve também no Firestore se estiver disponível (mantém seu fluxo atual)
  async function postarLocalizacaoFirestore(lat, lng) {
    try {
      if (!window.db || !firebase.auth().currentUser) return;
      const uid = firebase.auth().currentUser.uid;
      await db.collection('localizacoes').collection('cuidadores').doc(uid).set({
        lat, lng, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge:true });
    } catch (e) {
      console.warn('Firestore erro ao postar localização:', e);
    }
  }

  // Subscrição da casa do cliente (via Firestore compat path)
  function subscribeClienteHouse(uid) {
    if (!uid || !window.firebase || !window.firebase.firestore) return;
    db.collection('localizacoes').collection('clientes').doc(uid).onSnapshot((doc) => {
      const d = doc.data();
      if (!d) return;
      upsertClienteMarker(d.lat, d.lng);
    });
  }

  // Subscrição via backend realtime NÃO é implementada aqui;
  // o backend (Supabase) pode notificar clientes via Realtime ou clientes podem fazer polling.
  // Aqui usamos Firestore realtime para mostrar cliente, e postamos no servidor também.
  async function fetchVinculoDoCuidador() {
    if (!usuarioId) return null;
    try {
      const res = await fetch(`/api/vinculo/cuidador/${usuarioId}`);
      if (!res.ok) return null;
      return res.json();
    } catch (e) { return null; }
  }

  async function carregarCasaDoClientePorAPI(id) {
    try {
      const res = await fetch(`/api/auth/localizacao/cliente/${id}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.lat !== undefined && json.lng !== undefined) {
        upsertClienteMarker(json.lat, json.lng);
      }
    } catch (e) {
      // ignora
    }
  }

  async function init() {
    setStatus('Inicializando...');
    try {
      await new Promise((resolve)=> firebase.auth().onAuthStateChanged((u)=>{ if(u) resolve(); else window.location.href='../../index.html'; }));
    } catch(e){ console.warn('Auth init fail', e); return; }

    if (view === 'cliente') {
      // se o cuidador estiver visualizando como cliente, não enviamos geolocalização aqui
      setStatus('Visualizando como cliente');
      return;
    }

    // Fluxo cuidador: encontra vínculo e subscreve à casa do cliente no Firestore (se houver),
    // e habilita envio de localização por geolocation.watchPosition()
    try {
      const vinc = await fetchVinculoDoCuidador();
      if (vinc && vinc.cliente_firebase_uid) {
        clienteUid = vinc.cliente_firebase_uid;
        subscribeClienteHouse(clienteUid);
      } else if (vinc && vinc.coordinates) {
        upsertClienteMarker(vinc.coordinates.lat, vinc.coordinates.lng);
      }
    } catch (e) {
      console.warn('Erro ao obter vínculo do cuidador', e);
    }

    // Habilita geolocation
    if (!navigator.geolocation) {
      setStatus('Geolocalização não suportada.');
      return;
    }

    let lastSent = 0;
    navigator.geolocation.watchPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      upsertCuidadorMarker(latitude, longitude);
      map.setView([latitude, longitude], 15);

      // postar para Firestore local (compat)
      try { await postarLocalizacaoFirestore(latitude, longitude); } catch (e){}

      const now = Date.now();
      // envia para servidor a cada 10s (evita spam)
      if (now - lastSent > 10000) {
        lastSent = now;
        await postarLocalizacaoServer(latitude, longitude);
      }

      if (clienteMarker) {
        const d = haversine(latitude, longitude, clienteMarker.getLatLng().lat, clienteMarker.getLatLng().lng);
        setStatus(`Distância até o cliente: ${km(d)} km`);
      } else {
        setStatus('Localizando cliente...');
      }
    }, (err) => {
      console.error(err);
      setStatus('Não foi possível obter a sua posição. Permita o acesso ao GPS.');
    }, { enableHighAccuracy: true });

    // Botão de simulação (mantido)
    const simulateBtn = document.getElementById('simulateBtn');
    if (simulateBtn) {
      simulateBtn.addEventListener('click', async () => {
        const lat = -23.55 + (Math.random() * 0.02);
        const lng = -46.63 + (Math.random() * 0.02);
        upsertCuidadorMarker(lat, lng);
        try { await postarLocalizacaoFirestore(lat, lng); } catch(e){}
        await postarLocalizacaoServer(lat, lng);
      });
    }
  }

  init();
})();
