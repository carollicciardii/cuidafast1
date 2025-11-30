// Public/JS/cuidaloc.js
// Página do Cuidador — envia localização ao backend (/api/auth/localizacao/cuidador) usando Supabase auth.
// Removed firebase usage; now uses Supabase client in browser.

(async function () {
  // Dependência: inclua no HTML antes deste script:
  // <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
  // e defina no HTML <script> window.SUPABASE_URL = '...'; window.SUPABASE_ANON_KEY = '...';
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('SUPABASE_URL ou SUPABASE_ANON_KEY não definidos em window.');
  }
  const supabase = supabaseJs.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

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
  const view = (params.get('view') || '').toLowerCase();
  let clienteMarker = null;
  let cuidadorMarker = null;

  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  function upsertCuidadorMarker(lat, lng) {
    const icon = L.divIcon({
      className: '',
      html: '<i class="ph-user ph-bold ph-icon" style="font-size:28px;color:#0d6efd"></i>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    if (cuidadorMarker) cuidadorMarker.setLatLng([lat, lng]);
    else cuidadorMarker = L.marker([lat, lng], { icon }).addTo(map).bindPopup('Minha posição');
  }

  function upsertClienteMarker(lat, lng) {
    const icon = L.divIcon({
      className: '',
      html: '<i class="ph-house ph-bold ph-icon" style="font-size:30px;color:#333"></i>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    if (clienteMarker) clienteMarker.setLatLng([lat, lng]);
    else clienteMarker = L.marker([lat, lng], { icon }).addTo(map).bindPopup('Casa do cliente');
  }

  // pega token de sessão do supabase
  async function getAuthToken() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || null;
    return token;
  }

  async function authFetch(url, options = {}, retry = true) {
    const token = await getAuthToken();
    if (!token) throw new Error('Não autenticado (supabase session ausente)');
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers||{}) }
    });
    if (res.status === 401 && retry) {
      // tenta renovar sessão (force refresh)
      try {
        await supabase.auth.refreshSession();
      } catch (e) {}
      const freshToken = (await supabase.auth.getSession()).data?.session?.access_token;
      return fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}`, ...(options.headers||{}) } });
    }
    return res;
  }

  async function postarLocalizacaoServer(lat, lng) {
    try {
      await authFetch('/api/auth/localizacao/cuidador', {
        method: 'POST',
        body: JSON.stringify({ lat: Number(lat), lng: Number(lng), usuario_id: usuarioId })
      });
    } catch (e) {
      console.warn('Falha ao enviar localização para o servidor:', e.message || e);
    }
  }

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
    } catch (e) {}
  }

  async function init() {
    setStatus('Inicializando...');
    // Verifica sessão supabase (substitui firebase onAuthStateChanged)
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      // tenta redirecionar para login (mantém fluxo antigo)
      window.location.href = '../../index.html';
      return;
    }

    if (view === 'cliente') {
      setStatus('Visualizando como cliente');
      return;
    }

    try {
      const vinc = await fetchVinculoDoCuidador();
      if (vinc && vinc.cliente_firebase_uid) {
        // seu DB pode ainda retornar firebase ids; caso contrário, use coordinates
        // aqui apenas tenta carregar via API (usuarioId)
        await carregarCasaDoClientePorAPI(vinc.cliente_usuario_id || usuarioId);
      } else if (vinc && vinc.coordinates) {
        upsertClienteMarker(vinc.coordinates.lat, vinc.coordinates.lng);
      }
    } catch (e) {
      console.warn('Erro obter vínculo:', e);
    }

    if (!navigator.geolocation) {
      setStatus('Geolocalização não suportada.');
      return;
    }

    let lastSent = 0;
    navigator.geolocation.watchPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      upsertCuidadorMarker(latitude, longitude);
      map.setView([latitude, longitude], 15);

      const now = Date.now();
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
      setStatus('Permita acesso ao GPS.');
    }, { enableHighAccuracy: true });

    // simulate button
    const simulateBtn = document.getElementById('simulateBtn');
    if (simulateBtn) {
      simulateBtn.addEventListener('click', async () => {
        const lat = -23.55 + (Math.random() * 0.02);
        const lng = -46.63 + (Math.random() * 0.02);
        upsertCuidadorMarker(lat, lng);
        await postarLocalizacaoServer(lat, lng);
      });
    }
  }

  init();
})();
