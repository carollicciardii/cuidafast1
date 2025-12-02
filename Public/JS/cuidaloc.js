// Public/JS/cuidaloc.js
// Captura geolocalização do dispositivo e envia para endpoint serverless (upsert).
// Substitua o arquivo por este.

(function () {
  // usuário (padrão localStorage)
  const usuarioId = Number(localStorage.getItem('usuario_id')) || null;
  // se você usa auth_uid no frontend, pode também passar:
  const authUid = localStorage.getItem('auth_uid') || null;

  async function postDeviceLocation({ lat, lng, accuracy = null, role = 'person' }) {
    const payload = {
      usuario_id: usuarioId,
      auth_uid: authUid,
      lat,
      lng,
      accuracy,
      role // 'person' ou 'device' etc
    };

    try {
      const resp = await fetch('/api/localizacao/cuidador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await resp.text().catch(()=>null);
      let body = null;
      try { body = text ? JSON.parse(text) : null } catch(e){ body = text; }

      if (!resp.ok) {
        console.error('Erro ao enviar location', resp.status, body);
        return { ok: false, status: resp.status, body };
      }
      return { ok: true, status: resp.status, body };
    } catch (err) {
      console.error('postDeviceLocation error', err);
      return { ok: false, error: err };
    }
  }

  window.cuidalocSendCurrentPosition = function() {
    if (!navigator.geolocation) { alert('Geolocalização não suportada'); return; }

    document.getElementById('status') && (document.getElementById('status').textContent = 'Aguardando permissão...');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy || null;
      document.getElementById('status') && (document.getElementById('status').textContent = `Posição obtida: ${lat}, ${lng}`);
      const r = await postDeviceLocation({ lat, lng, accuracy, role: 'person' });
      if (r.ok) {
        document.getElementById('status') && (document.getElementById('status').textContent = 'Localização enviada com sucesso.');
        alert('Localização enviada com sucesso.');
      } else {
        document.getElementById('status') && (document.getElementById('status').textContent = 'Erro ao enviar localização.');
        alert('Erro ao enviar localização. Veja console.');
      }
    }, (err) => {
      console.error('geolocation error', err);
      document.getElementById('status') && (document.getElementById('status').textContent = 'Permissão negada ou erro.');
      alert('Não foi possível obter a localização: ' + (err.message || err.code));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 });
  };

  // botão simulate (útil para testes sem GPS)
  const btn = document.getElementById('simulateBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      // exemplo: local próximo à FECAP (ou altere manualmente)
      const testLat = -23.5487;
      const testLng = -46.6341;
      document.getElementById('status') && (document.getElementById('status').textContent = 'Enviando localização simulada...');
      const r = await postDeviceLocation({ lat: testLat, lng: testLng, accuracy: 5, role: 'person' });
      if (r.ok) {
        document.getElementById('status') && (document.getElementById('status').textContent = 'Localização simulada enviada.');
        alert('Simulação enviada.');
      } else {
        document.getElementById('status') && (document.getElementById('status').textContent = 'Erro na simulação.');
        alert('Erro ao simular localização. Veja console.');
      }
    });
  }
})();
