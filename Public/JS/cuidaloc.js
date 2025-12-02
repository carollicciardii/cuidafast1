// Public/JS/cuidaloc.js
// Versão fixa: usa API_BASE_URL e fornece mensagens amigáveis quando aberto via file://

(function () {
  // Se você tem backend remoto (ex: Vercel), defina antes de incluir este script:
  // <script>window.API_BASE_URL = 'https://cuidafast1.vercel.app'</script>
  const configuredBase = window.API_BASE_URL || null;

  // Determina base para chamadas fetch:
  function resolveApiBase() {
    // se houve configuração explícita, usa ela
    if (configuredBase && typeof configuredBase === 'string') return configuredBase.replace(/\/$/, '');
    // se origin é válido (http/https), usa location.origin
    try {
      const origin = location && location.origin;
      if (origin && origin !== 'null' && (origin.startsWith('http://') || origin.startsWith('https://'))) {
        return origin;
      }
    } catch (e) {}
    // fallback: undefined -> sinaliza que o dev precisa definir
    return null;
  }

  const API_BASE = resolveApiBase();

  function showUserFriendlyError(msg) {
    console.error(msg);
    // se tiver elemento #status, escreve lá
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = msg;
    alert(msg);
  }

  async function postDeviceLocation({ lat, lng, accuracy = null, role = 'person' }) {
    if (!API_BASE) {
      showUserFriendlyError(
        'Erro: API_BASE não definida. Abra a página via http://localhost ou defina window.API_BASE_URL para apontar ao backend (ex: https://seu-backend.vercel.app).'
      );
      return { ok: false, error: 'API_BASE_NOT_SET' };
    }

    const payload = {
      usuario_id: Number(localStorage.getItem('usuario_id')) || null,
      auth_uid: localStorage.getItem('auth_uid') || null,
      lat,
      lng,
      accuracy,
      role
    };

    const url = `${API_BASE}/api/localizacao/cuidador`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await resp.text().catch(() => null);
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }

      if (!resp.ok) {
        console.error('POST failed', resp.status, body);
        return { ok: false, status: resp.status, body };
      }
      return { ok: true, status: resp.status, body };
    } catch (err) {
      console.error('postDeviceLocation error', err);
      return { ok: false, error: err };
    }
  }

  window.cuidalocSendCurrentPosition = function () {
    if (!navigator.geolocation) { showUserFriendlyError('Geolocalização não suportada'); return; }

    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Aguardando permissão...';

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy || null;
      if (statusEl) statusEl.textContent = `Posição obtida: ${lat}, ${lng}`;
      const r = await postDeviceLocation({ lat, lng, accuracy, role: 'person' });
      if (r.ok) {
        if (statusEl) statusEl.textContent = 'Localização enviada com sucesso.';
        alert('Localização enviada com sucesso.');
      } else {
        if (statusEl) statusEl.textContent = 'Erro ao enviar localização. Veja console.';
        if (r.error === 'API_BASE_NOT_SET') {
          // já mostrado mensagem
        } else {
          alert('Erro ao enviar localização. Veja console (possível CORS ou URL incorreta).');
        }
      }
    }, (err) => {
      console.error('geolocation error', err);
      if (statusEl) statusEl.textContent = 'Permissão negada ou erro.';
      alert('Não foi possível obter a localização: ' + (err.message || err.code));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 });
  };

  // botão simulate (útil para testes sem GPS)
  const btn = document.getElementById('simulateBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      const testLat = -23.5487;
      const testLng = -46.6341;
      const statusEl = document.getElementById('status');
      if (statusEl) statusEl.textContent = 'Enviando localização simulada...';
      const r = await postDeviceLocation({ lat: testLat, lng: testLng, accuracy: 5, role: 'person' });
      if (r.ok) {
        if (statusEl) statusEl.textContent = 'Localização simulada enviada.';
        alert('Simulação enviada.');
      } else {
        if (statusEl) statusEl.textContent = 'Erro na simulação. Veja console.';
        alert('Erro ao simular localização. Veja console.');
      }
    });
  }
})();
