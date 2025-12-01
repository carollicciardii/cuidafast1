// Public/JS/servicos.js
// mapa e polling do cuidador (cliente vê casa + cuidador em tempo próximo)
(function () {
  // inicialização do supabase (UMD expõe window.supabase)
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('SUPABASE_URL ou SUPABASE_ANON_KEY não definidos em window.');
  }
  const supabase = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;
  if (!supabase) console.error('Supabase UMD não encontrado. Verifique se carregou supabase.min.js');

  // inicializa mapa
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
  let clienteUid = null;
  let cuidadorUid = null;
  let clienteMarker = null;
  let cuidadorMarker = null;

  /* FALLBACK fetch helper:
     - tenta a URL original
     - se retornar 404 e houver alternativas (passadas no segundo argumento), tenta elas sequencialmente
     - útil para endpoints que podem aceitar query ou path param (/api/x?id=123 vs /api/x/123) */
  async function fetchWithAlternatives(originalUrl, options = {}, alternatives = []) {
    try {
      const r = await fetch(originalUrl, options);
      if (r.status !== 404) return r;
      // se 404 e alternativas fornecidas, tenta em ordem
      for (const alt of alternatives) {
        try {
          const r2 = await fetch(alt, options);
          if (r2.status !== 404) return r2;
        } catch (e) { /* next */ }
      }
      // retorna o primeiro 404 (original)
      return new Response('', { status: 404, statusText: 'Not Found' });
    } catch (err) {
      // falha de rede, tenta alternativas
      for (const alt of alternatives) {
        try {
          const r2 = await fetch(alt, options);
          if (r2.status !== 404) return r2;
        } catch (e) { /* next */ }
      }
      throw err;
    }
  }

  async function authFetch(url, options = {}, retry = true) {
    // Usa supabase para obter sessão (front-end)
    if (!supabase) throw new Error('Supabase não inicializado');
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Não autenticado');
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers||{}) } });
    if (res.status === 401 && retry) {
      // tenta forçar refresh do token
      await supabase.auth.getSession({ forceRefresh: true });
      const { data: newSession } = await supabase.auth.getSession();
      const fresh = newSession?.session?.access_token;
      return fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fresh}`, ...(options.headers||{}) } });
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

  // pega casa do cliente (irá chamar /api/localizacao/cliente/{usuarioId})
  async function loadClienteAndCenter() {
    if (!usuarioId) return;
    try {
      // tenta path padrão que implementamos: /api/localizacao/cliente/{id}
      const url1 = `/api/localizacao/cliente/${usuarioId}`;
      // alternativas: query param
      const urlAlt = `/api/localizacao/cliente?id=${usuarioId}`;
      const res = await fetchWithAlternatives(url1, {}, [urlAlt]);
      if (!res.ok) {
        console.warn('cliente location não encontrada', res.status);
        return;
      }
      const json = await res.json();
      if (json && json.coordinates) {
        upsertClienteMarker(json.coordinates.lat, json.coordinates.lng);
        map.setView([json.coordinates.lat, json.coordinates.lng], 15);
        updateDistanceIfPossible();
      }
    } catch (err) {
      console.warn('Erro ao carregar casa do cliente', err);
    }
  }

  // pega vínculo -> cuidadores vinculados ao cliente
  async function getVinculoCuidador() {
    if (!usuarioId) return null;
    try {
      // duas formas possíveis: path param ou query
      const url1 = `/api/vinculo/cliente/${usuarioId}`;
      const urlAlt = `/api/vinculo/cliente?id=${usuarioId}`;
      const res = await fetchWithAlternatives(url1, {}, [urlAlt]);
      if (!res.ok) return null;
      const v = await res.json();
      return v;
    } catch (err) {
      console.warn('Erro ao buscar vinculo', err);
      return null;
    }
  }

  // polling para localização do cuidador pelo auth_uid (a cada 5s)
  let pollTimer = null;
  async function startCuidadorPolling(authUid) {
    if (!authUid) return;
    if (pollTimer) clearInterval(pollTimer);
    async function poll() {
      try {
        const urlBase = `/api/localizacao/cuidador?auth_uid=${encodeURIComponent(authUid)}`;
        const alt1 = `/api/localizacao/cuidador/${encodeURIComponent(authUid)}`;
        const res = await fetchWithAlternatives(urlBase, {}, [alt1]);
        if (!res.ok) {
          // console.warn('cuidador location poll non-ok', res.status);
          return;
        }
        const j = await res.json();
        if (j && j.coordinates) {
          upsertCuidadorMarker(j.coordinates.lat, j.coordinates.lng, j.updated_at || j.updatedAt);
          updateDistanceIfPossible();
        }
      } catch (err) {
        console.warn('Erro no poll do cuidador', err);
      }
    }
    // primeira chamada imediata
    await poll();
    pollTimer = setInterval(poll, 5000); // 5s
  }

  (async function init(){
    try {
      // só para checar autenticação de cliente: se usar outra lógica, adapte aqui
      if (!supabase) {
        console.warn('supabase não inicializado, algumas features podem não funcionar');
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data?.session && !usuarioId) {
          // sem sessão e sem id, redireciona para login (comentado se quiser manter)
          // window.location.href = '../../index.html';
        }
      }

      await loadClienteAndCenter();

      const vinc = await getVinculoCuidador();
      if (!vinc) return;
      // procura auth uid do cuidador no vínculo
      const authUid = vinc.cuidador_firebase_uid || vinc.cuidador_auth_uid || vinc.cuidador_id || null;
      const linkCuidadorId = vinc.cuidador_id || null;

      if (authUid && typeof authUid === 'string' && authUid.includes('-')) {
        // parece UUID -> usar polling por auth_uid
        await startCuidadorPolling(authUid);
      } else if (authUid) {
        // se for um identificador sem UUID, ainda podemos tentar
        await startCuidadorPolling(authUid);
      } else if (linkCuidadorId) {
        // Se não tiver authUid mas tiver apenas o id interno, tenta buscar localizacao por usuario_id (pode-se adaptar endpoint)
        async function pollByUsuarioId() {
          try {
            const url1 = `/api/localizacao/cuidador?usuario_id=${encodeURIComponent(linkCuidadorId)}`;
            const urlAlt = `/api/localizacao/cuidador/${encodeURIComponent(linkCuidadorId)}`;
            const res = await fetchWithAlternatives(url1, {}, [urlAlt]);
            if (!res.ok) return;
            const j = await res.json();
            if (j && j.coordinates) {
              upsertCuidadorMarker(j.coordinates.lat, j.coordinates.lng, j.updated_at || j.updatedAt);
              updateDistanceIfPossible();
            }
          } catch (err) {}
        }
        await pollByUsuarioId();
        setInterval(pollByUsuarioId, 5000);
      }
    } catch (err) {
      console.warn('init servicos error', err);
    }
  })();

  // --- ADICIONAL: exemplos de chamadas que estavam falhando (user-data, notificacoes, mensagens)
  // coloquei retries para tentar formatos alternativos caso o backend aceite path ou query

  async function tryLoadUserData(usuarioId) {
    if (!usuarioId) return null;
    const u1 = `/api/auth/user-data?id=${usuarioId}`;
    const u2 = `/api/auth/user-data/${usuarioId}`;
    try {
      const r = await fetchWithAlternatives(u1, {}, [u2]);
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      console.warn('user-data fetch failed', e);
      return null;
    }
  }

  async function tryLoadNotificacoes(usuarioId) {
    if (!usuarioId) return null;
    const u1 = `/api/notificacoes/usuario/${usuarioId}/nao-lidas`;
    const u2 = `/api/notificacoes/usuario?id=${usuarioId}&filter=nao-lidas`;
    try {
      const r = await fetchWithAlternatives(u1, {}, [u2]);
      if (!r.ok) return [];
      return await r.json();
    } catch (e) {
      console.warn('notificacoes fetch failed', e);
      return [];
    }
  }

  async function tryLoadConversas(usuarioId) {
    if (!usuarioId) return [];
    const u1 = `/api/mensagens/conversas/${usuarioId}`;
    const u2 = `/api/mensagens/conversas?id=${usuarioId}`;
    try {
      const r = await fetchWithAlternatives(u1, {}, [u2]);
      if (!r.ok) return [];
      return await r.json();
    } catch (e) {
      console.warn('conversas fetch failed', e);
      return [];
    }
  }

  // Se quiser acionar manualmente (debug) - comentar/descomentar:
  (async function debugLoads() {
    try {
      if (!usuarioId) return;
      const ud = await tryLoadUserData(usuarioId);
      if (!ud) console.warn('user-data não encontrada');
      const nots = await tryLoadNotificacoes(usuarioId);
      const conv = await tryLoadConversas(usuarioId);
      // logs apenas para debug, não altera fluxo UI
      console.log('debug user-data:', ud);
      console.log('debug notificacoes:', nots);
      console.log('debug conversas:', conv);
    } catch (e) {}
  })();

})();
