// Rota específica para google-login como fallback
import authController from '../../back-end/api/controllers/authController.js';

async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  return new Promise((resolve, reject) => {
    let data = '';
    req.on && req.on('data', (chunk) => (data += chunk));
    req.on && req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        const ct = (req.headers && req.headers['content-type']) || '';
        if (ct.includes('application/x-www-form-urlencoded')) {
          const obj = Object.fromEntries(new URLSearchParams(data));
          return resolve(obj);
        }
        return reject(err);
      }
    });
    req.on && req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Garantir req.body parseado
    if (!req.body || typeof req.body === 'string') {
      try {
        req.body = await parseJsonBody(req);
      } catch (err) {
        console.warn('Failed to parse JSON body:', err);
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }

    console.log('[api/auth/google-login] Chamando googleLogin controller');
    return authController.googleLogin(req, res);
  } catch (err) {
    console.error('[api/auth/google-login] Erro inesperado:', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message });
  }
}

