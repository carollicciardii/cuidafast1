// Public/JS/servicos.js
// Atualizado: adiciona "pessoinha" ao lado de FECAP, geocoding de endereço do usuario_id,
// e função para receber localização do dispositivo (cuidaloc) e salvar como pessoinha.
// Substitua inteiramente o arquivo existente por este.

// ---------- Config / Inicialização ----------
(function () {
  // coordenadas da FECAP (ajuste se desejar)
  const FECAP_COORDS = { lat: -23.548600, lng: -46.634230 }; // ponto de teste - ajuste se preferir
  const PERSON_OFFSET_METERS = 25; // distância aproximada em metros a deslocar a "pessoinha" da FECAP

  // checa variáveis expostas no window (conforme instrução para HTML)
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('SUPABASE_URL ou SUPABASE_ANON_KEY não definidos em window. Veja README para configurar.');
  }

  // cria cliente supabase (UMD expõe window.supabase)
  const supabase = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

  if (!supabase) {
    console.error('Supabase não inicializado. Verifique se importou supabase UMD antes de servicos.js');
  }

  // ---------- Leaflet map ----------
  const map = L.map('map').setView([FECAP_COORDS.lat, FECAP_COORDS.lng], 15);
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
  let personMarker = null; // marker da "pessoinha" (ao lado da FECAP)

  // ---------- ICONS ----------
  function createHouseIcon() {
    return L.divIcon({
      className: '',
      html: '<i class="ph-house ph-bold ph-icon" style="font-size:30px;color:#333"></i>',
      iconSize: [32,32],
      iconAnchor: [16,16]
    });
  }

  function createPersonIcon() {
    return L.divIcon({
      className: '',
      html: '<i class="ph-user-circle ph-bold ph-icon" style="font-size:28px;color:#2b8a3e"></i>',
      iconSize: [30,30],
      iconAnchor: [15,15]
    });
  }

  // ---------- Marker upserts ----------
  function upsertClienteMarker(lat, lng) {
    const icon = createHouseIcon();
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

  function upsertPersonMarker(lat, lng, popupText = 'Pessoa (teste)') {
    const icon = createPersonIcon();
    if (personMarker) {
      personMarker.setLatLng([lat,lng]).setPopupContent(popupText);
    } else {
      personMarker = L.marker([lat,lng], { icon }).addTo(map).bindPopup(popupText);
    }
  }

  function updateDistanceIfPossible() {
    if (clienteMarker && cuidadorMarker) {
      const a = clienteMarker.getLatLng();
      const b = cuidadorMarker.getLatLng();
      const d = haversine(a.lat, a.lng, b.lat, b.lng);
      if (distanciaEl) distanciaEl.textContent = `Distância entre você e o cuidador: ${km(d)} km`;
    }
    // se quiser distância entre cliente e person, adicione aqui
  }

  // ---------- Supabase helpers (lat/lng) ----------
  async function saveLocationToSupabase({ usuario_id = null, auth_uid = null, lat, lng, metadata = null }) {
    if (!supabase) throw new Error('Supabase não inicializado');
    try {
      const row = {};
      if (auth_uid) row.auth_uid = auth_uid;
      if (usuario_id) row.usuario_id = usuario_id;
      row.lat = lat;
      row.lng = lng;
      row.metadata = metadata || { };

      // onConflict por auth_uid se fornecido, senão por usuario_id
      const onConflict = auth_uid ? 'auth_uid' : (usuario_id ? 'usuario_id' : null);

      const query = supabase
        .from('localizacoes')
        .upsert(row, { onConflict: onConflict })
        .select('*');

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao salvar location no Supabase:', error);
        return { error };
      }
      return { data };
    } catch (err) {
      console.error('saveLocationToSupabase erro:', err);
      return { error: err };
    }
  }

  async function getLocationFromSupabase({ usuario_id = null, auth_uid = null }) {
    if (!supabase) throw new Error('Supabase não inicializado');
    try {
      let q;
      if (auth_uid) {
        q = supabase.from('localizacoes').select('*').eq('auth_uid', auth_uid).limit(1);
      } else if (usuario_id) {
        q = supabase.from('localizacoes').select('*').eq('usuario_id', usuario_id).limit(1);
      } else {
        return null;
      }
      const { data, error } = await q;
      if (error) {
        console.warn('getLocationFromSupabase erro:', error);
        return null;
      }
      if (!data || data.length === 0) return null;
      return data[0];
    } catch (err) {
      console.warn('getLocationFromSupabase exceção:', err);
      return null;
    }
  }

  // ---------- Utils ----------
  // desloca um ponto (lat,lng) em metros num azimute (bearing em graus) — util para posicionar pessoinha ao lado
  function offsetLatLng(lat, lng, metersEast = 0, metersNorth = 0) {
    // aproximação: 1 deg lat ~ 111320 m; 1 deg lon ~ 111320 * cos(lat)
    const dLat = metersNorth / 111320;
    const dLng = metersEast / (111320 * Math.cos(lat * Math.PI / 180));
    return { lat: lat + dLat, lng: lng + dLng };
  }

  // ---------- FALLBACK fetch helper (mantive sua lógica) ----------
  async function fetchWithAlternatives(originalUrl, options = {}, alternatives = []) {
    try {
      const r = await fetch(originalUrl, options);
      if (r.status !== 404) return r;
      for (const alt of alternatives) {
        try {
          const r2 = await fetch(alt, options);
          if (r2.status !== 404) return r2;
        } catch (e) { /* next */ }
      }
      return new Response('', { status: 404, statusText: 'Not Found' });
    } catch (err) {
      for (const alt of alternatives) {
        try {
          const r2 = await fetch(alt, options);
          if (r2.status !== 404) return r2;
        } catch (e) { /* next */ }
      }
      throw err;
    }
  }

  // ---------- Geocoding (Nominatim OSM) ----------
  // Monta uma string de endereço e chama Nominatim para obter lat/lng
  async function geocodeAddressToLatLng(addressString) {
    if (!addressString || addressString.trim() === '') return null;
    // Nominatim endpoint público — use com cautela (rate limits)
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(addressString)}&limit=1&addressdetails=0`;
    try {
      const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
      if (!res.ok) {
        console.warn('Geocode request failed', res.status);
        return null;
      }
      const arr = await res.json();
      if (!arr || arr.length === 0) return null;
      const first = arr[0];
      return { lat: Number(first.lat), lng: Number(first.lon) };
    } catch (err) {
      console.warn('geocodeAddressToLatLng erro', err);
      return null;
    }
  }

  // ---------- Busca endereço associado a usuario_id e converte em lat/lng ------
  // Este método tenta, na ordem:
  // 1) consultar tabela "usuario" no supabase buscando campos comuns (endereco, rua, numero, cep, cidade, estado)
  // 2) fallback: chamar endpoint /api/auth/user-data?id={usuario_id} (sua API)
  // 3) geocodificar a string montada e fazer upsert na tabela localizacoes (tipo casa)
  async function geocodeUsuarioEnderecoAndSave(usuario_id) {
    if (!usuario_id) return { error: 'usuario_id ausente' };
    let userRecord = null;

    // tenta supabase
    try {
      const { data, error } = await supabase
        .from('usuario')
        .select('usuario_id, nome, email, endereco, rua, numero, complemento, bairro, cidade, estado, cep')
        .eq('usuario_id', usuario_id)
        .limit(1);

      if (!error && data && data.length > 0) {
        userRecord = data[0];
      }
    } catch (e) {
      console.warn('Erro consultando usuario no supabase', e);
    }

    // fallback para sua API
    if (!userRecord) {
      try {
        const res = await fetchWithAlternatives(`/api/auth/user-data?id=${usuario_id}`, {}, [`/api/auth/user-data/${usuario_id}`]);
        if (res.ok) {
          const j = await res.json();
          // assume que j tem campos de endereço — adaptável
          userRecord = j;
        }
      } catch (e) {
        console.warn('fallback user-data API error', e);
      }
    }

    if (!userRecord) {
      return { error: 'Endereço do usuário não encontrado' };
    }

    // Monta string de endereço com heurística simples
    const parts = [];
    if (userRecord.endereco) parts.push(userRecord.endereco);
    if (userRecord.rua) parts.push(userRecord.rua);
    if (userRecord.numero) parts.push(userRecord.numero);
    if (userRecord.bairro) parts.push(userRecord.bairro);
    if (userRecord.cidade) parts.push(userRecord.cidade);
    if (userRecord.estado) parts.push(userRecord.estado);
    if (userRecord.cep) parts.push(userRecord.cep);
    const addressString = parts.join(', ').trim();

    if (!addressString) {
      return { error: 'Usuário não possui endereço completo para geocodificar' };
    }

    const coords = await geocodeAddressToLatLng(addressString);
    if (!coords) {
      return { error: 'Não foi possível geocodificar o endereço' };
    }

    // salva no supabase como tipo "casa" (usa usuario_id)
    const metadata = { created_by: 'geocodeUsuarioEnderecoAndSave', source: 'geocode', address: addressString };
    const saved = await saveLocationToSupabase({ usuario_id, lat: coords.lat, lng: coords.lng, metadata });
    if (saved.error) return { error: saved.error };

    // plota no mapa como casa (upsertClienteMarker)
    upsertClienteMarker(coords.lat, coords.lng);
    map.setView([coords.lat, coords.lng], 15);

    return { success: true, coords, saved };
  }

  // ---------- cria ponto de teste na FECAP e pessoinha ao lado ----------
  async function ensureFecapTestPointAndPlot() {
    try {
      if (!supabase) {
        // só plota localmente: casinha + pessoinha deslocada
        upsertClienteMarker(FECAP_COORDS.lat, FECAP_COORDS.lng);
        // calcula offset simples a leste para a pessoinha
        const off = offsetLatLng(FECAP_COORDS.lat, FECAP_COORDS.lng, PERSON_OFFSET_METERS, 0);
        upsertPersonMarker(off.lat, off.lng, 'Pessoa de teste (próximo à FECAP)');
        map.setView([FECAP_COORDS.lat, FECAP_COORDS.lng], 15);
        if (clienteMarker) clienteMarker.bindPopup('FECAP (teste)').openPopup();
        return;
      }

      // busca se já existe ponto FECAP (metadata.name == 'FECAP_TEST')
      const { data: fecapData, error: fecapErr } = await supabase
        .from('localizacoes')
        .select('*')
        .contains('metadata', { name: 'FECAP_TEST' })
        .limit(1);

      if (fecapErr) console.warn('Erro consultando ponto FECAP no supabase:', fecapErr);

      let fecapRec = (fecapData && fecapData.length) ? fecapData[0] : null;

      if (!fecapRec) {
        // insere FECAP
        const insert = {
          usuario_id: null,
          auth_uid: null,
          lat: FECAP_COORDS.lat,
          lng: FECAP_COORDS.lng,
          metadata: { name: 'FECAP_TEST', test_point: true, created_by: 'frontend' }
        };
        const { data: inserted, error: insertErr } = await supabase
          .from('localizacoes')
          .insert(insert)
          .select()
          .limit(1);

        if (insertErr) {
          console.warn('Erro inserindo ponto FECAP de teste:', insertErr);
          // fallback local
          upsertClienteMarker(FECAP_COORDS.lat, FECAP_COORDS.lng);
          if (clienteMarker) clienteMarker.bindPopup('FECAP (teste - local)').openPopup();
          // still create person offset locally
          const offLocal = offsetLatLng(FECAP_COORDS.lat, FECAP_COORDS.lng, PERSON_OFFSET_METERS, 0);
          upsertPersonMarker(offLocal.lat, offLocal.lng, 'Pessoa de teste (próximo à FECAP)');
          map.setView([FECAP_COORDS.lat, FECAP_COORDS.lng], 15);
          return;
        }
        fecapRec = (inserted && inserted.length) ? inserted[0] : null;
      }

      // plota casinha (FECAP)
      if (fecapRec) {
        upsertClienteMarker(Number(fecapRec.lat), Number(fecapRec.lng));
        if (clienteMarker) clienteMarker.bindPopup('FECAP (teste)').openPopup();
        map.setView([Number(fecapRec.lat), Number(fecapRec.lng)], 15);

        // agora cria (ou upsert) pessoinha ao lado no banco: metadata.name = 'FECAP_PERSON'
        // calcula offset
        const off = offsetLatLng(Number(fecapRec.lat), Number(fecapRec.lng), PERSON_OFFSET_METERS, 0);
        // tenta encontrar pessoinha já existente
        const { data: personData, error: personErr } = await supabase
          .from('localizacoes')
          .select('*')
          .contains('metadata', { name: 'FECAP_PERSON' })
          .limit(1);

        if (personErr) console.warn('Erro buscando FECAP_PERSON:', personErr);

        if (personData && personData.length > 0) {
          // atualiza coords localmente
          const p = personData[0];
          upsertPersonMarker(Number(p.lat), Number(p.lng), 'Pessoa (próximo à FECAP)');
        } else {
          // insere pessoinha
          const insertPerson = {
            usuario_id: null,
            auth_uid: null,
            lat: off.lat,
            lng: off.lng,
            metadata: { name: 'FECAP_PERSON', test_point: true, created_by: 'frontend' }
          };
          const { data: insertedP, error: insertPErr } = await supabase
            .from('localizacoes')
            .insert(insertPerson)
            .select()
            .limit(1);

          if (insertPErr) {
            console.warn('Erro inserindo FECAP_PERSON:', insertPErr);
            // mesmo se falhar, plota no mapa local
            upsertPersonMarker(off.lat, off.lng, 'Pessoa (próximo à FECAP - local)');
            return;
          }
          if (insertedP && insertedP.length) {
            const rec = insertedP[0];
            upsertPersonMarker(Number(rec.lat), Number(rec.lng), 'Pessoa (próximo à FECAP)');
          }
        }
      }

      // finalmente, garante updateDistance
      updateDistanceIfPossible();

    } catch (err) {
      console.warn('[servicos] ensureFecapTestPointAndPlot erro', err);
      // fallback visual
      upsertClienteMarker(FECAP_COORDS.lat, FECAP_COORDS.lng);
      const off = offsetLatLng(FECAP_COORDS.lat, FECAP_COORDS.lng, PERSON_OFFSET_METERS, 0);
      upsertPersonMarker(off.lat, off.lng, 'Pessoa (próximo à FECAP)');
      if (clienteMarker) clienteMarker.bindPopup('FECAP (teste)').openPopup();
      map.setView([FECAP_COORDS.lat, FECAP_COORDS.lng], 15);
    }
  }

  // ---------- Vinculo + polling do cuidador (mantive como estava) ----------
  async function getVinculoCuidador() {
    if (!usuarioId) return null;
    try {
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

  let pollTimer = null;
  async function startCuidadorPolling(authUid) {
    if (!authUid) return;
    if (pollTimer) clearInterval(pollTimer);

    async function poll() {
      try {
        // Primeiro tenta buscar no supabase por auth_uid
        const local = await getLocationFromSupabase({ auth_uid: authUid });
        if (local) {
          upsertCuidadorMarker(Number(local.lat), Number(local.lng), local.updated_at || local.created_at);
          updateDistanceIfPossible();
          return;
        }

        // se não encontrou no supabase, tenta sua API
        const urlBase = `/api/localizacao/cuidador?auth_uid=${encodeURIComponent(authUid)}`;
        const alt1 = `/api/localizacao/cuidador/${encodeURIComponent(authUid)}`;
        const res = await fetchWithAlternatives(urlBase, {}, [alt1]);
        if (!res.ok) {
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

    await poll();
    pollTimer = setInterval(poll, 5000);
  }

  // ---------- Init ----------
  (async function init(){
    try {
      if (!supabase) {
        console.warn('supabase não inicializado, algumas features podem não funcionar');
      } else {
        try {
          const { data } = await supabase.auth.getSession();
        } catch (e) {}
      }

      await loadClienteAndCenter();

      const vinc = await getVinculoCuidador();
      if (!vinc) return;
      const authUid = vinc.cuidador_firebase_uid || vinc.cuidador_auth_uid || vinc.cuidador_id || null;
      const linkCuidadorId = vinc.cuidador_id || null;

      if (authUid) {
        await startCuidadorPolling(authUid);
      } else if (linkCuidadorId) {
        async function pollByUsuarioId() {
          try {
            const local = await getLocationFromSupabase({ usuario_id: linkCuidadorId });
            if (local) {
              upsertCuidadorMarker(Number(local.lat), Number(local.lng), local.updated_at || local.created_at);
              updateDistanceIfPossible();
            } else {
              const url1 = `/api/localizacao/cuidador?usuario_id=${encodeURIComponent(linkCuidadorId)}`;
              const urlAlt = `/api/localizacao/cuidador/${encodeURIComponent(linkCuidadorId)}`;
              const res = await fetchWithAlternatives(url1, {}, [urlAlt]);
              if (!res.ok) return;
              const j = await res.json();
              if (j && j.coordinates) {
                upsertCuidadorMarker(j.coordinates.lat, j.coordinates.lng, j.updated_at || j.updatedAt);
                updateDistanceIfPossible();
              }
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

  // ---------- loadClienteAndCenter (usa geocodeUsuarioEnderecoAndSave se encontrar endereço) ----------
  async function loadClienteAndCenter() {
    if (!usuarioId) {
      console.log('[servicos] usuarioId não definido, plota ponto de teste FECAP');
      await ensureFecapTestPointAndPlot();
      return;
    }

    try {
      // tenta buscar de supabase (preferível)
      const local = await getLocationFromSupabase({ usuario_id: usuarioId });
      if (local) {
        upsertClienteMarker(Number(local.lat), Number(local.lng));
        map.setView([Number(local.lat), Number(local.lng)], 15);
        updateDistanceIfPossible();
        return;
      }

      // se não existir, tenta geocodificar endereço do usuário e salvar
      const geocodeResult = await geocodeUsuarioEnderecoAndSave(usuarioId);
      if (geocodeResult && geocodeResult.success) {
        // já plotado dentro da função
        return;
      }

      // se ainda nada, tenta endpoints locais (sua API)
      const url1 = `/api/localizacao/cliente/${usuarioId}`;
      const urlAlt = `/api/localizacao/cliente?id=${usuarioId}`;
      const res = await fetchWithAlternatives(url1, {}, [urlAlt]);
      if (!res.ok) {
        console.warn('[servicos] cliente location não encontrada via API', res.status);
        await ensureFecapTestPointAndPlot();
        return;
      }
      const json = await res.json();
      if (json && json.coordinates) {
        upsertClienteMarker(json.coordinates.lat, json.coordinates.lng);
        map.setView([json.coordinates.lat, json.coordinates.lng], 15);
        updateDistanceIfPossible();
        return;
      }

      // fallback
      await ensureFecapTestPointAndPlot();

    } catch (err) {
      console.warn('[servicos] Erro ao carregar casa do cliente', err);
      await ensureFecapTestPointAndPlot();
    }
  }

  // ---------- Expor funções úteis no window para debug e uso por outras páginas ----------
  window.servicosDebug = {
    saveLocationToSupabase,
    getLocationFromSupabase,
    ensureFecapTestPointAndPlot,
    geocodeAddressToLatLng,
    geocodeUsuarioEnderecoAndSave,
    upsertPersonMarker,
    upsertClienteMarker
  };

})();
