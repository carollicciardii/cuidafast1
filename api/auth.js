// api/auth/[...slug].js
import authController from '../../back-end/api/controllers/authController.js';
import completeProfile from '../authe/complete-profile.js'; // ideal: mover esse arquivo para ../auth/complete-profile.js
import createOrAssociateUser from '../create-or-associate-user.js';

export default async function handler(req, res) {
  try {
    // Log básico para debug
    console.log('[auth.catchall] method=', req.method, 'url=', req.url, 'host=', req.headers.host);

    // Normaliza path (cuida de casos onde req.url pode vir absoluto ou relativo)
    let pathname = req.url.split('?')[0];
    if (/^https?:\/\//i.test(pathname)) {
      pathname = new URL(pathname).pathname;
    }

    // Remove /api prefix se presente (por segurança)
    // Esperamos algo como /api/auth/xxx
    // Queremos o subpath após /api/auth
    const apiPrefix = '/api/auth';
    let subpath = '/';
    if (pathname.startsWith(apiPrefix)) {
      subpath = pathname.slice(apiPrefix.length) || '/';
    } else if (pathname.startsWith('/auth')) {
      // em alguns ambientes pode vir sem /api
      subpath = pathname.slice('/auth'.length) || '/';
    } else {
      // fallback: pega tudo depois da última ocorrência de /auth
      const idx = pathname.lastIndexOf('/auth');
      subpath = idx >= 0 ? pathname.slice(idx + '/auth'.length) || '/' : pathname;
    }

    // Normaliza
    if (!subpath.startsWith('/')) subpath = '/' + subpath;

    console.log('[auth.catchall] subpath=', subpath);

    // Rotas
    // HEALTH CHECK -> GET /api/auth
    if ((subpath === '/' || subpath === '') && req.method === 'GET') {
      return res.status(200).json({ ok: true, rota: 'auth funcionando!' });
    }

    // LOGIN / LOGOUT / REFRESH / GOOGLE LOGIN
    if (subpath === '/login' && req.method === 'POST') {
      return authController.login(req, res);
    }
    if (subpath === '/logout' && req.method === 'POST') {
      return authController.logout(req, res);
    }
    if (subpath === '/refresh' && req.method === 'POST') {
      return authController.refresh(req, res);
    }
    if (subpath === '/google-login' && req.method === 'POST') {
      return authController.googleLogin(req, res);
    }

    // REGISTER
    if (subpath === '/register' && req.method === 'POST') {
      return authController.register(req, res);
    }

    // COMPLETE PROFILE (OAuth supabase + dados complementares)
    if (subpath === '/complete-profile' && req.method === 'POST') {
      return completeProfile(req, res);
    }

    // COMPLETE CUIDADOR PROFILE (compatibilidade)
    if (subpath === '/complete-cuidador-profile' && req.method === 'POST') {
      return completeProfile(req, res);
    }

    // CREATE OR ASSOCIATE USER
    if (subpath === '/create-or-associate-user' && req.method === 'POST') {
      return createOrAssociateUser(req, res);
    }

    // Se quiser, adicione mais dispatchs aqui...

    // DEFAULT
    console.warn('[auth.catchall] rota não encontrada', { subpath, method: req.method });
    return res.status(404).json({ error: 'Rota não encontrada', path: subpath });
  } catch (err) {
    console.error('[auth.catchall] unexpected error', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message || String(err) });
  }
}
