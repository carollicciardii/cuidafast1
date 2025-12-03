import handler from '../../../back-end/api/controllers/perfilController.js';

/**
 * Endpoint: GET /api/perfil/cuidadores
 * 
 * Proxy simples para o controller de perfil, forçando action="cuidadores"
 * para reaproveitar a lógica já existente em back-end/api/controllers/perfilController.js
 */
export default async function cuidadoresHandler(req, res) {
  // Garantir que req.query exista
  req.query = req.query || {};
  req.query.action = 'cuidadores';

  return handler(req, res);
}


