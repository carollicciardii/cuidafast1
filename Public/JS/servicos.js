// Public/JS/servicos.js
// Versão: integração via endpoints /api/localizacao/* (server-side controller).
// Adição: roteamento por ruas via OSRM (router.project-osrm.org).
// Mantive todo o resto intacto; adicionei getRouteBetweenPointsOSRM + desenho GeoJSON.

(function () {
  // CONFIG
  const FECAP_COORDS = { lat: -23.528464, lng: -46.5564568 }; // fallback visual
  const MAP_ELEMENT_ID = 'map';

  // Coordenada do terceiro ponto (pessoinha extra) — mude aqui se quiser outro local
  const EXTRA_PERSON_COORDS = { lat: -23.55740007, lng: -46.6368266 };

  // OSRM endpoint (demo). Para produção, substitua por seu roteador ou por serviço pago (Mapbox/ORS).
  const OSRM_BASE = 'https://router.project-osrm.org';

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
  let extraPersonMarker = null; // terceiro ponto solicitado

  // rota/geojson layer global
  let routeLayer = null;

  function createHouseIcon() {
    return L.divIcon({ className: '', html: '<i class="ph-house ph-bold ph-icon" style="font-size:30px;color:#333"></i>', iconSize: [32,32], iconAnchor: [16,16] });
  }
  function createPersonIcon() {
    return L.divIcon({ className: '', html: '<i class="ph-user-circle ph-bold ph-icon" style="font-size:28px;color:#2b8a3e"></i>', iconSize: [30,30], iconAnchor: [15,15] });
  }
  function createCuidadorIcon() {
    return L.divIcon({ className: '', html: '<i class="ph-user ph-bold ph-icon" style="font-size:28px;color:#0d6efd"></i>', iconSize: [32,32], iconAnchor: [16,16] });
  }

  // desenha rota GeoJSON no mapa (substitui a anterior polyline)
  function drawRouteGeoJSON(geojson) {
    // remove rota anterior
    if (routeLayer) {
      try { map.removeLayer(routeLayer); } catch(e) {}
      routeLayer = null;
    }
    if (!geojson) return;
    routeLayer = L.geoJSON(geojson, {
      style: function () {
        return { color: '#0d6efd', weight: 5, opacity: 0.9 };
      }
    }).addTo(map);
  }

  // Faz request ao OSRM para obter rota entre dois pontos (lat/lng)
  // Retorna GeoJSON LineString (rota) ou null em erro.
  async function getRouteBetweenPointsOSRM(lat1, lng1, lat2, lng2) {
    try {
      // OSRM espera ordem: lon,lat
      const coords = `${lng1},${lat1};${lng2},${lat2}`;
      const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('OSRM route failed', res.status);
        return null;
      }
      const j = await res.json();
      if (!j || !j.routes || j.routes.length === 0) return null;
      const route = j.routes[0];
      // route.geometry é um GeoJSON LineString object (if geometries=geojson)
      // mas alguns OSRM deployments retornam {type:'LineString', coordinates: [...]}
      if (route.geometry) {
        return route.geometry; // GeoJSON geometry
      }
      // fallback: if polyline encoded (not our case), you'd decode here
      return null;
    } catch (err) {
      console.warn('getRouteBetweenPointsOSRM erro', err);
      return null;
    }
  }

  // atualiza a view e desenha rota entre casa e a "pessoa" escolhida (agora por ruas)
  async function updateMapViewAndRoute() {
    try {
      if (!clienteMarker) return; // precisa da casa para comparar
      // prioridade: personMarker -> cuidadorMarker -> extraPersonMarker
      const targetMarker = personMarker || cuidadorMarker || extraPersonMarker || null;
      if (!targetMarker) return;

      const cLatLng = clienteMarker.getLatLng();
      const tLatLng = targetMarker.getLatLng();

      // primeiro faz fitBounds incluindo ambos com padding
      const bounds = L.latLngBounds([ [cLatLng.lat, cLatLng.lng], [tLatLng.lat, tLatLng.lng] ]);
      map.fitBounds(bounds, { padding: [60,60] });

      // solicita rota ao OSRM e desenha GeoJSON (se disponível)
      const geo = await getRouteBetweenPointsOSRM(cLatLng.lat, cLatLng.lng, tLatLng.lat, tLatLng.lng);
      if (geo) {
        drawRouteGeoJSON(geo);
      } else {
        // fallback: desenha linha reta se rota não puder ser obtida
        if (routeLayer) { try { map.removeLayer(routeLayer); } catch(e){} routeLayer = null; }
        const latlngs = [ [cLatLng.lat, cLatLng.lng], [tLatLng.lat, tLatLng.lng] ];
        routeLayer = L.polyline(latlngs, { weight: 4, opacity: 0.8, dashArray: '6,6' }).addTo(map);
      }
    } catch (err) {
      console.warn('updateMapViewAndRoute erro', err);
    }
  }

  // função para limpar rota se necessário
  function clearRoute() {
    if (routeLayer) {
      try { map.removeLayer(routeLayer); } catch(e) {}
      routeLayer = null;
    }
  }

  function upsertClienteMarker(lat, lng) {
    const icon = createHouseIcon();
    if (clienteMarker) {
      clienteMarker.setLatLng([lat, lng]);
    } else {
      clienteMarker = L.marker([lat, lng], { icon }).addTo(map).bindPopup('Minha casa');
    }
    // chamar atualização de view/rota sempre que a casa for (re)colocada
    updateMapViewAndRoute();
  }
  function upsertPersonMarker(lat, lng, popupText = 'Pessoa') {
    const icon = createPersonIcon();
    if (personMarker) {
      personMarker.setLatLng([lat, lng]).setPopupContent(popupText);
    } else {
      personMarker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popupText);
    }
    // chamar atualização de view/rota sempre que a pessoa for (re)colocada
    updateMapViewAndRoute();
  }
  function upsertCuidadorMarker(lat, lng, updatedAt) {
    const icon = createCuidadorIcon();
    const popup = `Cuidador<br>Última atualização: ${updatedAt ? new Date(updatedAt).toLocaleTimeString() : ''}`;
    if (cuidadorMarker) {
      cuidadorMarker.setLatLng([lat,lng]).setPopupContent(popup);
    } else {
      cuidadorMarker = L.marker([lat,lng], { icon }).addTo(map).bindPopup(popup);
    }
    // chamar atualização de view/rota sempre que o cuidador for (re)colocado
    updateMapViewAndRoute();
  }

  // --- Novo: função simples para criar o terceiro ponto (pessoinha extra) ---
  function addExtraPersonStatic(lat = EXTRA_PERSON_COORDS.lat, lng = EXTRA_PERSON_COORDS.lng, popupText = 'Pessoa (extra)') {
    const icon = createPersonIcon();
    if (extraPersonMarker) {
      extraPersonMarker.setLatLng([lat, lng]).setPopupContent(popupText);
    } else {
      extraPersonMarker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popupText);
    }
    // atualizar view/rota para incluir este novo ponto (caso casa exista)
    updateMapViewAndRoute();
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
    const queryParams = new URLSearchParams();
    if (params.auth_uid) queryParams.append('auth_uid', params.auth_uid);
    else if (params.usuario_id) queryParams.append('usuario_id', params.usuario_id);

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    } else {
      return null; // Não há parâmetros para buscar
    }

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

      // === AQUI: adiciona o terceiro ponto estático da pessoinha ===
      // Não altera nada do restante — apenas exibe um marker com ícone de pessoa.
      try {
        addExtraPersonStatic(EXTRA_PERSON_COORDS.lat, EXTRA_PERSON_COORDS.lng, 'Pessoa (extra)');
      } catch (err) {
        console.warn('Erro ao adicionar extraPersonMarker:', err);
      }

      // OBS: se já existirem clienteMarker e algum dos person/cuidador/extraPerson, updateMapViewAndRoute() já foi chamado
      // pelos upsert/add functions acima.

    } catch (err) {
      console.warn('init servicos error', err);
    }
  })();

  // export debug helpers
  window.servicosDebug = {
    loadClienteAndCenter,
    fetchCuidadorLocationByAuthUidOrUsuario,
    upsertClienteMarker,
    upsertPersonMarker,
    addExtraPersonStatic, // exposto para facilitar testes/manipulação
    updateMapViewAndRoute,
    clearRoute
  };

})();
