// Public/JS/servicos.js
// Versão: integração via endpoints /api/localizacao/* (server-side controller).
// Substitua completamente o arquivo anterior por este.

(function () {
  // CONFIG
  const FECAP_COORDS = { lat: -23.548600, lng: -46.634230 }; // fallback visual
  const MAP_ELEMENT_ID = 'map';

  // Inicializa mapa
  const map = L.map(MAP_ELEMENT_ID).setView([FECAP_COORDS.lat, FECAP_COORDS.lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const infoCard = document.querySelector('.info-card');
  let distanciaEl = document.getElementById('distanciaInfo');
  if (!distanciaEl && infoCard) {
    distanciaEl = document.createElement('p');
    distanciaEl.id = 'distanciaInfo';
    distanciaEl.style.marginTop = '8px';
    distanciaEl.style.color = '#333333';
    infoCard.appendChild(distanciaEl);
  }

  function km(m) { return (m / 1000).toFixed(2); }
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371e3; const toRad = (v)=>v*Math.PI/180;
    const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // pega usuario_id do localStorage (padrão seu projeto)
  const usuarioId = Number(localStorage.getItem('usuario_id')) || Number(new URLSearchParams(location.search).get('id')) || null;

  // markers
  let clienteMarker = null;
  let personMarker = null;
  let cuidadorMarker = null;

  function createHouseIcon() {
    return L.divIcon({ className: '', html: '<i class="ph-house ph-bold ph-icon" style="font-size:30px;color:#333"></i>', iconSize: [32,32], iconAnchor: [16,16] });
  }
  function createPersonIcon() {
    return L.divIcon({ className: '', html: '<i class="ph-user-circle ph-bold ph-icon" style="font-size:28px;color:#2b8a3e"></i>', iconSize: [30,30], iconAnchor: [15,15] });
  }
  function createCuidadorIcon() {
    return L.divIcon({ className: '', html: '<i class="ph-user ph-bold ph-icon" style="font-size:28px;color:#0d6efd"></i>', iconSize: [32,32], iconAnchor: [16,16] });
  }

  function upsertClienteMarker(lat, lng) {
    const icon = createHouseIcon();
    if (clienteMarker) clienteMarker.setLatLng([lat, lng]); else clienteMarker = L.marker([lat, lng], { icon }).addTo(map).bindPopup('Minha casa');
  }
  function upsertPersonMarker(lat, lng, popupText = 'Pessoa') {
    const icon = createPersonIcon();
    if (personMarker) personMarker.setLatLng([lat, lng]).setPopupContent(popupText); else personMarker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popupText);
  }
  function upsertCuidadorMarker(lat, lng, updatedAt) {
    const icon = createCuidadorIcon();
    const popup = `Cuidador<br>Última atualização: ${updatedAt ? new Date(updatedAt).toLocaleTimeString() : ''}`;
    if (cuidadorMarker) cuidadorMarker.setLatLng([lat,lng]).setPopupContent(popup); else cuidadorMarker = L.marker([lat,lng], { icon }).addTo(map).bindPopup(popup);
  }

  function updateDistanceIfPossible() {
    if (clienteMarker && (personMarker || cuidadorMarker)) {
      const a = clienteMarker.getLatLng();
      const b = (personMarker || cuidadorMarker).getLatLng();
      const d = haversine(a.lat, a.lng, b.lat, b.lng);
      if (distanciaEl) distanciaEl.textContent = `Distância entre você e a pessoa/cuidador: ${km(d)} km`;
    }
  }

  // fetch helpers
  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(()=>null);
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch(e) { body = text; }
    return { ok: res.ok, status: res.status, body };
  }

  // Carrega localização do cliente (do banco) e plota casa
  async function loadClienteAndCenter() {
    if (!usuarioId) {
      // sem usuarioId => fallback FECAP
      map.setView([FECAP_COORDS.lat, FECAP_COORDS.lng], 15);
      upsertClienteMarker(FECAP_COORDS.lat, FECAP_COORDS.lng);
      return;
    }

    // chama endpoint serverless: GET /api/localizacao/cliente/{usuarioId}
    const url = `/api/localizacao/cliente/${usuarioId}`;
    const r = await fetchJson(url);
    if (!r.ok) {
      // se não encontrou, tenta geocode via server-side? (não implementado aqui) -> fallback
      console.warn('não encontrou localização da casa via API, status', r.status, r.body);
      map.setView([FECAP_COORDS.lat, FECAP_COORDS.lng], 15);
      upsertClienteMarker(FECAP_COORDS.lat, FECAP_COORDS.lng);
      return;
    }
    const json = r.body;
    if (json && json.coordinates) {
      upsertClienteMarker(Number(json.coordinates.lat), Number(json.coordinates.lng));
      map.setView([Number(json.coordinates.lat), Number(json.coordinates.lng)], 15);
      updateDistanceIfPossible();
      return;
    }
    // fallback visual
    upsertClienteMarker(FECAP_COORDS.lat, FECAP_COORDS.lng);
    map.setView([FECAP_COORDS.lat, FECAP_COORDS.lng], 15);
  }

  // Busca localização do cuidador/pessoa por auth_uid ou usuario_id
  async function fetchCuidadorLocationByAuthUidOrUsuario(params = {}) {
    // parâmetros: { auth_uid, usuario_id }
    let url = '/api/localizacao/cuidador';
    if (params.auth_uid) url += `?auth_uid=${encodeURIComponent(params.auth_uid)}`;
    else if (params.usuario_id) url += `?usuario_id=${encodeURIComponent(params.usuario_id)}`;

    const r = await fetchJson(url);
    if (!r.ok) return null;
    if (r.body && r.body.coordinates) return r.body;
    return null;
  }

  // Inicia polling para cuidador (5s)
  let pollTimer = null;
  async function startCuidadorPolling(authUid, usuarioIdParam) {
    if (!authUid && !usuarioIdParam) return;
    if (pollTimer) clearInterval(pollTimer);

    async function poll() {
      try {
        const data = await fetchCuidadorLocationByAuthUidOrUsuario({ auth_uid: authUid, usuario_id: usuarioIdParam });
        if (data && data.coordinates) {
          const lat = Number(data.coordinates.lat);
          const lng = Number(data.coordinates.lng);
          // puxa timestamp se houver
          const updatedAt = data.updated_at || data.atualizado_em || null;
          upsertCuidadorMarker(lat, lng, updatedAt);
          updateDistanceIfPossible();
        }
      } catch (err) {
        console.warn('poll error', err);
      }
    }
    await poll();
    pollTimer = setInterval(poll, 5000);
  }

  // Init
  (async function init(){
    try {
      await loadClienteAndCenter();

      // pega vínculo via sua API (mantive sua lógica)
      let vinc = null;
      try {
        const res = await fetch(`/api/vinculo/cliente/${usuarioId}`);
        if (res.ok) vinc = await res.json();
      } catch (e) { /* ignore */ }

      // tenta extrair auth uid do vínculo
      const authUid = vinc?.cuidador_firebase_uid || vinc?.cuidador_auth_uid || null;
      const linkCuidadorId = vinc?.cuidador_id || null;

      if (authUid) {
        await startCuidadorPolling(authUid, null);
      } else if (linkCuidadorId) {
        await startCuidadorPolling(null, linkCuidadorId);
      } else {
        // sem vinculo -> apenas tenta buscar qualquer person com metadata.role person relacionada ao usuario?
        // nada a fazer por enquanto
      }
    } catch (err) {
      console.warn('init servicos error', err);
    }
  })();

  // export debug helpers
  window.servicosDebug = {
    loadClienteAndCenter,
    fetchCuidadorLocationByAuthUidOrUsuario,
    upsertClienteMarker,
    upsertPersonMarker
  };

})();
