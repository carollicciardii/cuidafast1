// api/pagamento/create.js
const path = require('path');

// ajuste o require conforme sua estrutura real:
// se controllers estiver em api/controllers, use '../../controllers/pagamentoController'
// ex: const pagamentoController = require('../../controllers/pagamentoController');
const pagamentoController = require('../../controllers/pagamentoController');

module.exports = async function handler(req, res) {
  const { method, url } = req;

  try {
    // parse body manual (se quiser manter)
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });

    req.body = body;

    // suporte explícito para /api/pagamento/pix
    if (method === 'POST' && url.includes('/pagamento/pix')) {
      return await pagamentoController.criarPagamentoPIX(req, res);
    }

    // cartão
    if (method === 'POST' && url.includes('/pagamento/cartao')) {
      return await pagamentoController.criarPagamentoCartao(req, res);
    }

    // consultar GET /api/pagamento/:id
    if (method === 'GET' && url.includes('/pagamento/')) {
      const paymentId = url.split('/pagamento/')[1]?.split('?')[0];
      if (paymentId) {
        req.params = { payment_id: paymentId };
        // transform query string simples
        const qs = url.split('?')[1] || '';
        req.query = {};
        qs.split('&').forEach(p => {
          if (!p) return;
          const [k,v] = p.split('=');
          req.query[k] = decodeURIComponent(v || '');
        });
        return await pagamentoController.consultarPagamento(req, res);
      }
    }

    // rota retrocompatibilidade: POST /api/pagamento/create
    if (method === 'POST') {
      // se body indicar 'cartao' encaminha, senão assume PIX
      if (body && (body.metodo === 'cartao' || body.cartao)) {
        return await pagamentoController.criarPagamentoCartao(req, res);
      }
      return await pagamentoController.criarPagamentoPIX(req, res);
    }

    return res.status(405).json({ message: 'Método não permitido' });

  } catch (err) {
    console.error('Erro em /api/pagamento:', err);
    try {
      return res.status(500).json({
        success: false,
        error: 'Erro no servidor',
        message: err.message || 'Erro desconhecido ao processar pagamento'
      });
    } catch (jsonErr) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'Erro no servidor' }));
    }
  }
};