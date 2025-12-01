// Public/JS/cuidaloc.js
// Página do cuidador — envia pings de localização ao backend

(function () {
  // supabase UMD
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('SUPABASE_URL ou SUPABASE_ANON_KEY não definidos em window.');
  }
  const supabase = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;
  if (!supabase) console.error('Supabase UMD não encontrado. Verifique se carregou supabase.min.js');

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

  const params = new URLSearchParams(location.search);
  const usuarioId = Number(localStorage.getItem('usuario_id')) || Number(params.get('id')) || null;
  const view = (params.get('view') || '').toLowerCase(); // '' | 'cliente'
  let cuidadorAuthUid = null;
  let clienteMarker = null;
  let cuidadorMarker = null;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  // simple helper para upsert marker
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
    if (!supabase) throw new Error('Supabase não inicializado');
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Não autenticado');
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers||{}) } });
    if (res.status === 401 && retry) {
      await supabase.auth.getSession({ forceRefresh: true });
      const { data: s2 } = await supabase.auth.getSession();
      const fresh = s2?.session?.access_token;
      return fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fresh}`, ...(options.headers||{}) } });
    }
    return res;
  }

  async function postarLocalizacao(lat, lng) {
    try {
      // tenta pegar auth_uid do supabase
      let auth_uid = null;
      if (supabase) {
        try {
          const { data } = await supabase.auth.getUser();
          auth_uid = data?.user?.id || null;
        } catch (err) {
          // fallback: continua sem auth_uid
        }
      }

      const payload = { lat, lng };
      if (usuarioId) payload.usuario_id = usuarioId;
      if (auth_uid) payload.auth_uid = auth_uid;

      await fetch('/api/localizacao/cuidador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error('Falha ao enviar localização do cuidador', e);
    }
  }

  // subscribe client house (via Supabase table -> endpoint)
  async function subscribeClienteHouse(uid) {
    if (!uid) return;
    try {
      const res = await fetch(`/api/localizacao/cliente/${uid}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.coordinates) {
        upsertClienteMarker(json.coordinates.lat, json.coordinates.lng);
      }
    } catch (err) {
      console.warn('Erro subscribeClienteHouse', err);
    }
  }

  async function fetchVinculoDoCuidador() {
    if (!usuarioId) return null;
    try {
      const res = await fetch(`/api/vinculo/cuidador/${usuarioId}`);
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      return null;
    }
  }

  async function init() {
    setStatus('Inicializando...');
    try {
      // autenticação via supabase (redireciona se não autenticado)
      if (!supabase) {
        setStatus('Supabase não inicializado');
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          window.location.href = '../../index.html';
          return;
        }
      }

      const vinc = await fetchVinculoDoCuidador();
      if (vinc && vinc.cliente_firebase_uid) {
        // seu vinculo pode trazer cliente_firebase_uid ou cliente_auth_uid ou cliente_id
        const uid = vinc.cliente_firebase_uid || vinc.cliente_auth_uid || vinc.cliente_id;
        if (uid) await subscribeClienteHouse(uid);
      } else if (vinc && vinc.coordinates) {
        upsertClienteMarker(vinc.coordinates.lat, vinc.coordinates.lng);
      }

      // Se view 'cliente', não manda localização
      if (view === 'cliente') {
        setStatus('Visualizando como cliente');
        return;
      }

      // Obtém auth uid do supabase (se possível)
      try {
        const { data } = await supabase.auth.getUser();
        cuidadorAuthUid = data?.user?.id || null;
      } catch (err) {
        // ok
      }

      setStatus('Ativando geolocalização...');
    } catch (e) {
      console.warn('Sem vínculo do cuidador ou erro init', e);
    }

    if (view === 'cliente') return;

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
      // manda no máximo a cada 5s (ou altere para 3000ms)
      if (now - lastSent > 4000) {
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

    // botão de simulação se existir
    const simulateBtn = document.getElementById('simulateBtn');
    if (simulateBtn) {
      simulateBtn.addEventListener('click', async () => {
        const lat = -23.55 + (Math.random() * 0.02);
        const lng = -46.63 + (Math.random() * 0.02);
        upsertCuidadorMarker(lat, lng);
        await postarLocalizacao(lat, lng);
      });
    }
  }

  init();
})();
