// cuidaloc.js - Página do Cuidador
// Requer: Firebase compat (app+firestore), FirebaseConfig.js fornecendo firebase.initializeApp e const db

(function () {
  const map = L.map('map').setView([-23.5505, -46.6333], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const statusEl = document.getElementById('status');

  // Helpers
  const km = (m) => (m / 1000).toFixed(2);
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const toRad = (v) => v * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Identify caregiver and linked client
  const params = new URLSearchParams(location.search);
  const usuarioId = Number(localStorage.getItem('usuario_id')) || Number(params.get('id')) || null;
  const view = (params.get('view') || '').toLowerCase(); // '' | 'cliente'
  let cuidadorUid = null;
  let clienteUid = null;

  // Markers
  let cuidadorMarker = null;
  let clienteMarker = null;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  async function fetchVinculoDoCuidador() {
    if (!usuarioId) return null;
    const res = await fetch(`/api/vinculo/cuidador/${usuarioId}`);
    if (!res.ok) return null;
    return res.json();
  }

  async function fetchVinculoDoCliente() {
    if (!usuarioId) return null;
    const res = await fetch(`/api/vinculo/cliente/${usuarioId}`);
    if (!res.ok) return null;
    return res.json();
  }

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

  async function authFetch(url, options = {}, retry = true) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Não autenticado');
    const token = await user.getIdToken();
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    if (res.status === 401 && retry) {
      const fresh = await user.getIdToken(true);
      return fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fresh}`, ...(options.headers || {}) } });
    }
    return res;
  }

  async function postarLocalizacao(lat, lng) {
    try {
      await authFetch('/api/localizacao/cuidador', {
        method: 'POST',
        body: JSON.stringify({ lat, lng })
      });
    } catch (e) {
      console.error('Falha ao enviar localização do cuidador', e);
    }
  }

  function subscribeClienteHouse(uid) {
    if (!uid || !window.firebase || !window.firebase.firestore) return;
    db.collection('localizacoes').doc('clientes'); // ensure path comp
    const ref = db.collection('localizacoes').doc('clientes');
    // compat path style: localizacoes/clientes/{uid}
    db.collection('localizacoes').doc('clientes');
    db.collection('localizacoes').collection('clientes').doc(uid).onSnapshot((doc) => {
      const d = doc.data();
      if (!d) return;
      upsertClienteMarker(d.lat, d.lng);
    });
  }

   function subscribeCuidadorRealtime(uid) {
    if (!uid || !window.firebase || !window.firebase.firestore) return;
    db.collection('localizacoes').collection('cuidadores').doc(uid).onSnapshot((doc) => {
      const d = doc.data();
      if (!d) return;
      upsertCuidadorMarker(d.lat, d.lng);
      map.setView([d.lat, d.lng], 15);
      if (clienteMarker) {
        const dist = haversine(d.lat, d.lng, clienteMarker.getLatLng().lat, clienteMarker.getLatLng().lng);
        setStatus(`Distância até o cliente: ${km(dist)} km`);
      }
    });
  }

  async function carregarCasaDoClientePorAPI(id) {
    try {
      const res = await fetch(`/api/localizacao/cliente/${id}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.coordinates) {
        upsertClienteMarker(json.coordinates.lat, json.coordinates.lng);
      }
    } catch (e) {
      console.warn('Falha ao obter localização do cliente por API');
    }
  }

  async function init() {
    setStatus('Inicializando...');
    try {
      await new Promise((resolve) => firebase.auth().onAuthStateChanged((u)=>{ if(u) resolve(); else window.location.href = '../../index.html'; }));
      if (view === 'cliente') {
        const vinc = await fetchVinculoDoCliente();
        if (vinc && vinc.cuidador_firebase_uid) {
          cuidadorUid = vinc.cuidador_firebase_uid;
          subscribeCuidadorRealtime(cuidadorUid);
        }
        await carregarCasaDoClientePorAPI(usuarioId);
        setStatus('Aguardando localização do cuidador...');
      } else {
        const vinculo = await fetchVinculoDoCuidador();
        if (vinculo && vinculo.cliente_firebase_uid) {
          clienteUid = vinculo.cliente_firebase_uid;
          subscribeClienteHouse(clienteUid);
        } else if (vinculo && vinculo.coordinates) {
          upsertClienteMarker(vinculo.coordinates.lat, vinculo.coordinates.lng);
        }
        setStatus('Ativando geolocalização...');
      }
    } catch (e) {
      console.warn('Sem vínculo do cuidador encontrado ainda.');
    }

    if (view === 'cliente') {
      return; // Cliente não envia geolocalização neste fluxo
    }

    if (!navigator.geolocation) {
      setStatus('Geolocalização não suportada.');
      return;
    }

    let lastSent = 0;
    navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      upsertCuidadorMarker(latitude, longitude);
      map.setView([latitude, longitude], 15);

      const now = Date.now();
      if (now - lastSent > 10000) { // 10s
        lastSent = now;
        postarLocalizacao(latitude, longitude);
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
  }

  const simulateBtn = document.getElementById('simulateBtn');
  if (simulateBtn) {
    simulateBtn.addEventListener('click', async () => {
      const lat = -23.55 + (Math.random() * 0.02);
      const lng = -46.63 + (Math.random() * 0.02);
      upsertCuidadorMarker(lat, lng);
      await postarLocalizacao(lat, lng);
    });
  }

  init();
})();
