// api/auth/[...slug].js
// Importações dinâmicas para evitar problemas no Vercel

let authController = null;
let createOrAssociateUser = null;
let completeProfile = null;
let localizacaoController = null;

/* ============================================================
   LOAD MODULES — FINAL E CORRETO
   ============================================================ */
async function loadModules() {

  // AUTH CONTROLLER
  if (!authController) {
    const module = await import('../back-end/api/controllers/authController.js');
    authController = module.default || module;
  }

  // CREATE OR ASSOCIATE USER
  if (!createOrAssociateUser) {
    const module = await import('./create-or-associate-user.js');
    createOrAssociateUser = module.default;
  }

  // COMPLETE PROFILE
  if (!completeProfile) {
    const module = await import('../back-end/api/controllers/completeProfileController.js');
    completeProfile = module.completeProfile;
  }

  // LOCALIZACAO CONTROLLER
  if (!localizacaoController) {
    try {
      const module = await import('../back-end/api/controllers/localizacaoController.js');
      localizacaoController = module.default || module;
    } catch (err) {
      console.error('Erro ao carregar localizacaoController:', err);
      localizacaoController = null;
    }
  }
}

/* ============================================================
   BODY PARSER (mantido)
   ============================================================ */
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
        const ct = req.headers?.['content-type'] || '';
        if (ct.includes('application/x-www-form-urlencoded')) {
          return resolve(Object.fromEntries(new URLSearchParams(data)));
        }
        reject(err);
      }
    });
    req.on && req.on('error', reject);
  });
}

/* ============================================================
   HANDLER PRINCIPAL
   ============================================================ */
export default async function handler(req, res) {
  try {
    await loadModules();

    const { method, query, url } = req;

    const originalUrl =
      req.headers['x-vercel-original-url'] ||
      req.headers['x-invoke-path'] ||
      url ||
      req.url;

    const urlPath = originalUrl.split('?')[0];

    console.log('[api/auth] handler START', { method, urlPath });

    /* ============================================================
       ROTAS DE LOCALIZAÇÃO
       ============================================================ */
    if (urlPath.includes('/api/localizacao')) {
      if (!localizacaoController) {
        return res.status(500).json({ error: 'localizacaoController indisponível' });
      }

      // POST /api/localizacao/cuidador
      if (method === 'POST' && urlPath.endsWith('/localizacao/cuidador')) {
        req.body = req.body || await parseJsonBody(req);
        return localizacaoController.upsertCuidador(req, res);
      }

      // GET /api/localizacao/cliente/{id}
      if (method === 'GET' && urlPath.includes('/localizacao/cliente')) {
        return localizacaoController.getClienteLocation(req, res);
      }

      // GET /api/localizacao/cuidador
      if (method === 'GET' && urlPath.includes('/localizacao/cuidador')) {
        return localizacaoController.getCuidadorLocationByAuthUid(req, res);
      }

      return res.status(404).json({ error: 'rota de localizacao não encontrada' });
    }

    /* ============================================================
       complete-profile via ?path=
       ============================================================ */
    if (
      query?.path === 'complete-profile' ||
      query?.path === 'complete-cuidador-profile'
    ) {
      if (method === 'POST') {
        req.body = req.body || await parseJsonBody(req);
        return completeProfile(req, res);
      }
    }

    /* ============================================================
       complete-profile via URL
       ============================================================ */
    if (method === 'POST' && urlPath.includes('/complete-profile')) {
      req.body = req.body || await parseJsonBody(req);
      return completeProfile(req, res);
    }

    /* ============================================================
       Extrai PATH para rotas /api/auth/*
       ============================================================ */
    let path = '';

    if (query?.slug) {
      const arr = Array.isArray(query.slug) ? query.slug : [query.slug];
      path = arr.join('/');
    } else if (urlPath.includes('/api/auth/')) {
      path = urlPath.replace('/api/auth/', '');
    }

    if (!path && query?.path) {
      path = Array.isArray(query.path) ? query.path.join('/') : query.path;
    }

    /* ============================================================
       HEALTH CHECK
       ============================================================ */
    if (!path) {
      if (method === 'GET') return res.status(200).json({ ok: true });
      return res.status(405).json({ error: 'Method not allowed' });
    }

    /* ============================================================
       GARANTE JSON BODY
       ============================================================ */
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      req.body = req.body || await parseJsonBody(req);
    }

    /* ============================================================
       ROTAS DE AUTENTICAÇÃO
       ============================================================ */
    if (path === 'login' && method === 'POST')
      return authController.login(req, res);

    if (path === 'logout' && method === 'POST')
      return authController.logout(req, res);

    if (path === 'refresh' && method === 'POST')
      return authController.refresh(req, res);

    if (path === 'google-login' && method === 'POST')
      return authController.googleLogin(req, res);

    if (path === 'register' && method === 'POST')
      return authController.register(req, res);

    if (
      (path === 'complete-profile' || path === 'complete-cuidador-profile') &&
      method === 'POST'
    ) {
      return completeProfile(req, res);
    }

    if (path === 'create-or-associate-user' && method === 'POST')
      return createOrAssociateUser(req, res);

    if (path.includes('user-data') && method === 'GET')
      return authController.getUserData(req, res);

    /* ============================================================
       404 FINAL
       ============================================================ */
    return res.status(404).json({ error: 'Rota não encontrada', path, method });

  } catch (err) {
    console.error('Erro geral no handler:', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message });
  }
}
