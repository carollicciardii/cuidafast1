// api/auth/[...slug].js
import authController from '../../back-end/api/controllers/authController.js';
import createOrAssociateUser from '../create-or-associate-user.js';
import { completeProfile } from '../../back-end/api/controllers/completeProfileController.js';

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
    
    // Verifica a URL completa diretamente (como fazem api/mensagens.js e api/perfil.js)
    const fullUrl = url || req.url || '';
    const urlPath = fullUrl.split('?')[0]; // Remove query string
    
    console.log('[api/auth] URL completa:', fullUrl, 'urlPath:', urlPath, 'Method:', method, 'Query:', query);
    
    // Verifica se é a rota complete-profile diretamente pela URL
    if (urlPath === '/api/auth/complete-profile' && method === 'POST') {
      // Garantir req.body parseado
      if (!req.body || typeof req.body === 'string') {
        try {
          req.body = await parseJsonBody(req);
        } catch (err) {
          console.warn('Failed to parse JSON body:', err);
          return res.status(400).json({ error: 'Invalid JSON body' });
        }
      }
      console.log('[api/auth] Rota complete-profile detectada pela URL, chamando controller');
      return completeProfile(req, res);
    }
    
    // Extrai o path da URL para outras rotas
    let path = '';
    
    // Tenta obter do query.slug primeiro (funciona se arquivo estiver em api/auth/[...slug].js)
    if (query?.slug) {
      const slugArr = Array.isArray(query.slug) ? query.slug : [query.slug];
      path = slugArr.join('/');
    } 
    // Extrai diretamente da URL (compatível com Vercel)
    else if (urlPath) {
      // Verifica se a URL contém /api/auth/
      if (urlPath.startsWith('/api/auth/')) {
        path = urlPath.replace('/api/auth/', '');
      } else if (urlPath === '/api/auth' || urlPath === '/api/auth/') {
        path = '';
      } else if (urlPath.includes('/api/auth/')) {
        // Fallback: extrai mesmo que não comece com /api/auth/
        const parts = urlPath.split('/api/auth/');
        if (parts.length > 1 && parts[1]) {
          path = parts[1];
        }
      }
    }
    
    // Fallback adicional: verifica se há um parâmetro na query string (alguns casos do Vercel)
    if (!path && query?.path) {
      path = Array.isArray(query.path) ? query.path.join('/') : query.path;
    }
    
    console.log('[api/auth] Path extraído:', path);

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
      // Garantir req.body parseado
      if (!req.body || typeof req.body === 'string') {
        try {
          req.body = await parseJsonBody(req);
        } catch (err) {
          console.warn('Failed to parse JSON body:', err);
          return res.status(400).json({ error: 'Invalid JSON body' });
        }
      }
      console.log('[api/auth] Rota complete-profile encontrada pelo path, chamando controller');
      return completeProfile(req, res);
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
