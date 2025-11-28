// api/auth/[...slug].js
import authController from '../../back-end/api/controllers/authController.js';
import createOrAssociateUser from '../create-or-associate-user.js';
import completeProfileFromOldLocation from '../authe/complete-profile.js'; // atual: api/authe/complete-profile.js
// se você mudar o arquivo complete-profile para api/auth/complete-profile.js, altere a importação acima.

async function parseJsonBody(req) {
  // se já parsed (Next.js pode ter parseado), retorna
  if (req.body && typeof req.body === 'object') return req.body;

  // tenta ler stream e parsear JSON (compatibilidade Vercel)
  return new Promise((resolve, reject) => {
    let data = '';
    req.on && req.on('data', (chunk) => (data += chunk));
    req.on && req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        // tenta fallback: content-type application/x-www-form-urlencoded -> parse simples
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
  try {
    const { method, query, url } = req;
    
    // Extrai o path da URL ou do query.slug
    let path = '';
    
    // Tenta obter do query.slug primeiro (funciona se arquivo estiver em api/auth/[...slug].js)
    if (query?.slug) {
      const slugArr = Array.isArray(query.slug) ? query.slug : [query.slug];
      path = slugArr.join('/');
    } 
    // Se não tiver slug, extrai diretamente da URL (funciona se arquivo estiver em api/auth.js)
    else if (url) {
      // Remove /api/auth do início da URL
      const urlPath = url.split('?')[0]; // Remove query string
      const match = urlPath.match(/^\/api\/auth\/(.+)$/);
      if (match) {
        path = match[1];
      } else if (urlPath === '/api/auth' || urlPath === '/api/auth/') {
        path = '';
      }
    }
    
    console.log('[api/auth] URL:', url, 'Path extraído:', path, 'Query:', query);

    // Health check: GET /api/auth  OR GET /api/auth/
    if (!path || path === '') {
      if (method === 'GET') {
        return res.status(200).json({ ok: true, rota: 'auth funcionando' });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Garantir req.body parseado para handlers que precisarem
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && (!req.body || typeof req.body === 'string')) {
      try {
        req.body = await parseJsonBody(req);
      } catch (err) {
        console.warn('Failed to parse JSON body:', err);
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }

    // Roteamento - centralizado
    // O path já vem sem o prefixo /api/auth, então é apenas 'login', 'google-login', etc.
    console.log('[api/auth] Roteando para:', path, 'Method:', method);
    
    if (path === 'login' && method === 'POST') {
      return authController.login(req, res);
    }

    if (path === 'logout' && method === 'POST') {
      return authController.logout(req, res);
    }

    if (path === 'refresh' && method === 'POST') {
      return authController.refresh(req, res);
    }

    if (path === 'google-login' && method === 'POST') {
      console.log('[api/auth] Rota google-login encontrada, chamando controller');
      return authController.googleLogin(req, res);
    }

    if (path === 'register' && method === 'POST') {
      return authController.register(req, res);
    }

    if ((path === 'complete-profile' || path === 'complete-cuidador-profile') && method === 'POST') {
      // chama o completeProfile importado (do seu arquivo atual em api/authe/complete-profile.js)
      return completeProfileFromOldLocation(req, res);
    }

    if (path === 'create-or-associate-user' && method === 'POST') {
      return createOrAssociateUser(req, res);
    }

    if (path.includes('user-data') && method === 'GET') {
      return authController.getUserData(req, res);
    }

    console.error('[api/auth] Rota não encontrada:', path, 'Method:', method);
    return res.status(404).json({ error: 'Rota não encontrada', path, method, url: req.url });
  } catch (err) {
    console.error('auth catch-all unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message });
  }
}
