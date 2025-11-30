// Public/JS/servicos.js
// Página do Cliente — subscreve Firestore (se houver) e consulta endpoint server-side para obter posição do cuidador.
// Também faz fallback polling a cada 5s se não houver realtime.

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
let pollingInterval = null;

async function authFetch(url, options = {}, retry = true) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('Não autenticado');
  const token = await user.getIdToken();
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers||{}) } });
  if (res.status === 401 && retry) {
    const fresh = await user.getIdToken(true);
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

async function loadClienteAndCenter() {
  // usa API que já existe no backend para pegar dados do cliente logado
  try {
    const res = await authFetch('/api/cliente/me');
    if (!res.ok) return;
    const data = await res.json();
    clienteUid = data.firebaseUid || null;
    // Firestore realtime subscription (se estiver usando Firestore)
    if (clienteUid && window.db && db.collection) {
      db.collection('localizacoes').collection('clientes').doc(clienteUid).onSnapshot((doc) => {
        const d = doc.data(); if (!d) return;
        upsertClienteMarker(d.lat, d.lng);
        map.setView([d.lat, d.lng], 15);
        updateDistanceIfPossible();
      });
    } else {
      // tenta buscar via backend
      if (usuarioId) {
        await fetchClienteCasaPorAPI(usuarioId);
      }
    }
  } catch (e) {
    console.warn('Erro loadClienteAndCenter', e);
  }
}

async function fetchClienteCasaPorAPI(id) {
  try {
    const res = await fetch(`/api/auth/localizacao/cliente/${id}`);
    if (!res.ok) return;
    const json = await res.json();
    if (json && json.lat !== undefined && json.lng !== undefined) {
      upsertClienteMarker(json.lat, json.lng);
      map.setView([json.lat, json.lng], 15);
    }
  } catch (e) {}
}

async function subscribePairedCaregiver() {
  if (!usuarioId) return;
  try {
    const res = await fetch(`/api/vinculo/cliente/${usuarioId}`);
    if (!res.ok) return;
    const v = await res.json();
    if (!v.cuidador_id && !v.cuidador_firebase_uid) return;
    cuidadorUid = v.cuidador_firebase_uid || null;
    if (cuidadorUid && window.db && db.collection) {
      // Firestore realtime
      db.collection('localizacoes').collection('cuidadores').doc(cuidadorUid).onSnapshot((doc) => {
        const d = doc.data(); if (!d) return;
        upsertCuidadorMarker(d.lat, d.lng, d.atualizadoEm && d.atualizadoEm.toDate ? d.atualizadoEm.toDate() : d.atualizadoEm);
        updateDistanceIfPossible();
      });
    } else if (cuidadorUid) {
      // fallback: poll the server every 5s
      await fetchCuidadorViaAPIAndStartPolling(cuidadorUid);
    } else {
      // fallback: maybe server stores auth_uid instead of firebase uid; try API lookup by vinculodata
      if (v.cuidador_id) {
        // attempt to get via server by usuario id
        await fetchCuidadorViaAPIAndStartPollingByUsuarioId(v.cuidador_id);
      }
    }
  } catch (e) {
    console.warn('Erro subscribePairedCaregiver', e);
  }
}

async function fetchCuidadorViaAPIAndStartPolling(authUid) {
  // get initial and then poll every 5s
  clearInterval(pollingInterval);
  async function getOnce() {
    try {
      const res = await fetch(`/api/auth/localizacao/cuidador?auth_uid=${encodeURIComponent(authUid)}`);
      if (!res.ok) return;
      const j = await res.json();
      if (j && j.lat !== undefined && j.lng !== undefined) {
        upsertCuidadorMarker(j.lat, j.lng, j.atualizado_em || j.updated_at || j.atualizadoEm);
        updateDistanceIfPossible();
      }
    } catch (e) {}
  }
  await getOnce();
  pollingInterval = setInterval(getOnce, 5000); // 5s polling fallback
}

async function fetchCuidadorViaAPIAndStartPollingByUsuarioId(usuarioIdParam) {
  clearInterval(pollingInterval);
  async function getOnce() {
    try {
      const res = await fetch(`/api/auth/localizacao/cuidador?usuario_id=${encodeURIComponent(usuarioIdParam)}`);
      if (!res.ok) return;
      const j = await res.json();
      if (j && j.lat !== undefined && j.lng !== undefined) {
        upsertCuidadorMarker(j.lat, j.lng, j.atualizado_em || j.updated_at || j.atualizadoEm);
        updateDistanceIfPossible();
      }
    } catch (e) {}
  }
  await getOnce();
  pollingInterval = setInterval(getOnce, 5000);
}

(async function init(){
  await new Promise((resolve)=> firebase.auth().onAuthStateChanged((u)=>{ if(u) resolve(); else window.location.href='../../index.html'; }));
  await loadClienteAndCenter();
  await subscribePairedCaregiver();
})();
