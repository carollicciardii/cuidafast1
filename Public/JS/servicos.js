// Public/JS/servicos.js
// Página do Cliente — busca casa do cliente e posição do cuidador via backend (Supabase-authenticated).
// Polling de 5s para "ao vivo" caso não tenha realtime.

(async function () {
  // Dependência: inclua no HTML antes deste script:
  // <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
  // e defina window.SUPABASE_URL e window.SUPABASE_ANON_KEY
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('SUPABASE_URL ou SUPABASE_ANON_KEY não definidos em window.');
  }
  const supabase = supabaseJs.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  const map = L.map('map').setView([-23.5505, -46.6333], 13);
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

  const usuarioId = Number(localStorage.getItem('usuario_id')) || Number(new URLSearchParams(location.search).get('id')) || null;
  let clienteMarker = null;
  let cuidadorMarker = null;
  let pollingInterval = null;

  async function getAuthToken() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }

  async function authFetch(url, options = {}, retry = true) {
    const token = await getAuthToken();
    if (!token) throw new Error('Não autenticado (supabase session ausente)');
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers||{}) } });
    if (res.status === 401 && retry) {
      try { await supabase.auth.refreshSession(); } catch(e){}
      const freshToken = (await supabase.auth.getSession()).data?.session?.access_token;
      return fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}`, ...(options.headers||{}) } });
    }
    return res;
  }

  function upsertClienteMarker(lat, lng) {
    const icon = L.divIcon({ className: '', html: '<i class="ph-house ph-bold ph-icon" style="font-size:30px;color:#333"></i>', iconSize: [32,32], iconAnchor: [16,16] });
    if (clienteMarker) clienteMarker.setLatLng([lat,lng]); else clienteMarker = L.marker([lat,lng], { icon }).addTo(map).bindPopup('Minha casa');
  }

  function upsertCuidadorMarker(lat, lng, updatedAt) {
    const icon = L.divIcon({ className: '', html: '<i class="ph-user ph-bold ph-icon" style="font-size:28px;color:#0d6efd"></i>', iconSize: [32,32], iconAnchor: [16,16] });
    const popup = `Cuidador<br>Última atualização: ${updatedAt ? new Date(updatedAt).toLocaleTimeString() : ''}`;
    if (cuidadorMarker) {
      cuidadorMarker.setLatLng([lat,lng]).setPopupContent(popup);
    } else {
      cuidadorMarker = L.marker([lat,lng], { icon }).addTo(map).bindPopup(popup);
    }
  }

  function updateDistanceIfPossible() {
    if (clienteMarker && cuidadorMarker) {
      const a = clienteMarker.getLatLng();
      const b = cuidadorMarker.getLatLng();
      const d = haversine(a.lat, a.lng, b.lat, b.lng);
      if (distanciaEl) distanciaEl.textContent = `Distância entre você e o cuidador: ${km(d)} km`;
    }
  }

  async function fetchClienteCasaPorAPI(id) {
    try {
      // usa authFetch para garantir autorização
      const res = await authFetch(`/api/auth/localizacao/cliente/${id}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.lat !== undefined && json.lng !== undefined) {
        upsertClienteMarker(json.lat, json.lng);
        map.setView([json.lat, json.lng], 15);
      }
    } catch (e) {
      console.warn('fetchClienteCasaPorAPI erro', e);
    }
  }

  async function subscribePairedCaregiver() {
    if (!usuarioId) return;
    try {
      const res = await fetch(`/api/vinculo/cliente/${usuarioId}`);
      if (!res.ok) return;
      const v = await res.json();
      if (!v.cuidador_id && !v.cuidador_firebase_uid) return;
      const cuidadorUid = v.cuidador_firebase_uid || v.cuidador_id;
      if (!cuidadorUid) return;
      // fallback polling (5s)
      await fetchCuidadorViaAPIAndStartPolling(cuidadorUid);
    } catch (e) {
      console.warn('subscribePairedCaregiver erro', e);
    }
  }

  async function fetchCuidadorViaAPIAndStartPolling(authUidOrUsuarioId) {
    clearInterval(pollingInterval);
    async function getOnce() {
      try {
        // tenta por auth_uid primeiro
        const res = await authFetch(`/api/auth/localizacao/cuidador?auth_uid=${encodeURIComponent(authUidOrUsuarioId)}`);
        if (!res.ok) {
          // tenta por usuario_id
          const res2 = await authFetch(`/api/auth/localizacao/cuidador?usuario_id=${encodeURIComponent(authUidOrUsuarioId)}`);
          if (!res2.ok) return;
          const j2 = await res2.json();
          if (j2 && j2.lat !== undefined && j2.lng !== undefined) {
            upsertCuidadorMarker(j2.lat, j2.lng, j2.atualizado_em || j2.updated_at);
            updateDistanceIfPossible();
          }
          return;
        }
        const j = await res.json();
        if (j && j.lat !== undefined && j.lng !== undefined) {
          upsertCuidadorMarker(j.lat, j.lng, j.atualizado_em || j.updated_at);
          updateDistanceIfPossible();
        }
      } catch (e) {}
    }
    await getOnce();
    pollingInterval = setInterval(getOnce, 5000);
  }

  // init
  (async function init(){
    // Verifica sessão supabase
    const { data } = await supabaseJs.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY).auth.getSession();
    if (!data?.session) {
      window.location.href = '../../index.html';
      return;
    }

    await fetchClienteCasaPorAPI(usuarioId);
    await subscribePairedCaregiver();
  })();

})();
