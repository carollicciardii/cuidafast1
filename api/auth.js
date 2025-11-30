// api/auth/[...slug].js
// Importações dinâmicas para evitar problemas de resolução de caminhos no Vercel
let authController = null;
let createOrAssociateUser = null;
let completeProfile = null;

// Carrega os módulos dinamicamente
async function loadModules() {
  if (!authController) {
    try {
      // Tenta primeiro com ../back-end (caminho relativo a partir de api/)
      let authModule;
      try {
        authModule = await import('../back-end/api/controllers/authController.js');
      } catch (err1) {
        // Se falhar, tenta com ../../back-end
        try {
          authModule = await import('../../back-end/api/controllers/authController.js');
        } catch (err2) {
          console.error('Erro ao carregar authController (tentativas esgotadas):', err1, err2);
          throw err2;
        }
      }
      authController = authModule.default;
    } catch (err) {
      console.error('Erro ao carregar authController:', err);
      throw err;
    }
  }
  if (!createOrAssociateUser) {
    try {
      const createModule = await import('./create-or-associate-user.js');
      createOrAssociateUser = createModule.default;
    } catch (err) {
      console.error('Erro ao carregar createOrAssociateUser:', err);
      throw err;
    }
  }
  if (!completeProfile) {
    try {
      // Tenta primeiro com ../back-end (caminho relativo a partir de api/)
      let completeModule;
      try {
        completeModule = await import('../back-end/api/controllers/completeProfileController.js');
      } catch (err1) {
        // Se falhar, tenta com ../../back-end
        try {
          completeModule = await import('../../back-end/api/controllers/completeProfileController.js');
        } catch (err2) {
          console.error('Erro ao carregar completeProfile (tentativas esgotadas):', err1, err2);
          throw err2;
        }
      }
      completeProfile = completeModule.completeProfile;
    } catch (err) {
      console.error('Erro ao carregar completeProfile:', err);
      throw err;
    }
  }
}

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
    // Carrega os módulos se ainda não foram carregados
    await loadModules();
    
    const { method, query, url } = req;
    
    console.log('[api/auth] === INÍCIO DO HANDLER ===');
    console.log('[api/auth] Method:', method);
    console.log('[api/auth] URL:', url);
    console.log('[api/auth] req.url:', req.url);
    console.log('[api/auth] Query:', query);
    console.log('[api/auth] Headers:', {
      'x-vercel-original-url': req.headers['x-vercel-original-url'],
      'x-invoke-path': req.headers['x-invoke-path'],
      'x-vercel-rewrite': req.headers['x-vercel-rewrite'],
      'x-middleware-rewrite': req.headers['x-middleware-rewrite'],
      'host': req.headers['host'],
      'referer': req.headers['referer']
    });
    
    // PRIORIDADE 1: Verifica se foi passado via query parameter (rota do vercel.json)
    // Isso deve ser verificado PRIMEIRO porque é a forma mais confiável
    if (query?.path === 'complete-profile' || query?.path === 'complete-cuidador-profile') {
      if (method === 'POST') {
        // Garantir req.body parseado
        if (!req.body || typeof req.body === 'string') {
          try {
            req.body = await parseJsonBody(req);
          } catch (err) {
            console.warn('Failed to parse JSON body:', err);
            return res.status(400).json({ error: 'Invalid JSON body' });
          }
        }
        console.log('[api/auth] ✅ Rota complete-profile detectada via query.path, chamando controller');
        try {
          return await completeProfile(req, res);
        } catch (err) {
          console.error('[api/auth] Erro ao executar completeProfile:', err);
          return res.status(500).json({ error: 'Erro interno do servidor', message: err?.message || 'Erro desconhecido' });
        }
      }
    }
    
    // PRIORIDADE 2: Verifica a URL completa diretamente (como fazem api/mensagens.js e api/perfil.js)
    // Também verifica headers do Vercel que podem conter a URL original
    const originalUrl = req.headers['x-vercel-original-url'] || req.headers['x-invoke-path'] || url || req.url || '';
    const fullUrl = originalUrl;
    const urlPath = fullUrl.split('?')[0]; // Remove query string
    
    console.log('[api/auth] URL processada - originalUrl:', originalUrl, 'urlPath:', urlPath);
    
    // Verifica se é a rota complete-profile diretamente pela URL original
    if ((urlPath === '/api/auth/complete-profile' || urlPath.includes('/complete-profile')) && method === 'POST') {
      // Garantir req.body parseado
      if (!req.body || typeof req.body === 'string') {
        try {
          req.body = await parseJsonBody(req);
        } catch (err) {
          console.warn('Failed to parse JSON body:', err);
          return res.status(400).json({ error: 'Invalid JSON body' });
        }
      }
      console.log('[api/auth] ✅ Rota complete-profile detectada pela URL original, chamando controller');
      try {
        return await completeProfile(req, res);
      } catch (err) {
        console.error('[api/auth] Erro ao executar completeProfile:', err);
        return res.status(500).json({ error: 'Erro interno do servidor', message: err?.message || 'Erro desconhecido' });
      }
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
    if (urlPath.endsWith('/user-data')) {
      path = 'user-data';
  }
  

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
      console.log('[api/auth] ✅ Rota complete-profile encontrada pelo path extraído, chamando controller');
      try {
        return await completeProfile(req, res);
      } catch (err) {
        console.error('[api/auth] Erro ao executar completeProfile:', err);
        return res.status(500).json({ error: 'Erro interno do servidor', message: err?.message || 'Erro desconhecido' });
      }
    }
    
    // FALLBACK FINAL: Se chegou até aqui e não encontrou a rota, mas a URL original contém complete-profile
    // Isso pode acontecer se o Vercel não passou a URL corretamente
    if (method === 'POST' && (originalUrl.includes('complete-profile') || urlPath.includes('complete-profile'))) {
      console.log('[api/auth] ⚠️ FALLBACK: Tentando detectar complete-profile pela URL original');
      // Garantir req.body parseado
      if (!req.body || typeof req.body === 'string') {
        try {
          req.body = await parseJsonBody(req);
        } catch (err) {
          console.warn('Failed to parse JSON body:', err);
          return res.status(400).json({ error: 'Invalid JSON body' });
        }
      }
      // Verifica se o body contém dados típicos de complete-profile
      if (req.body && (req.body.cpf || req.body.cpf_numero || req.body.data_nascimento || req.body.tipo === 'cuidador')) {
        console.log('[api/auth] ✅ FALLBACK: Detectado complete-profile pelo conteúdo do body, chamando controller');
        try {
          return await completeProfile(req, res);
        } catch (err) {
          console.error('[api/auth] Erro ao executar completeProfile:', err);
          return res.status(500).json({ error: 'Erro interno do servidor', message: err?.message || 'Erro desconhecido' });
        }
      }
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
