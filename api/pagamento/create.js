const pagamentoController = require('../../back-end/api/controllers/pagamentoController');

export default async function handler(req, res) {
  const { method, url } = req;

  try {
    // Parse do body
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try {
          resolve(JSON.parse(data || '{}'));
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });

    // Rota: POST /api/pagamento/pix - Criar pagamento PIX
    if (method === 'POST' && url.includes('/pagamento/pix')) {
      // Merge body com query params
      req.body = body;
      return await pagamentoController.criarPagamentoPIX(req, res);
    }

    // Rota: POST /api/pagamento/cartao - Criar pagamento com cartão
    if (method === 'POST' && url.includes('/pagamento/cartao')) {
      req.body = body;
      return await pagamentoController.criarPagamentoCartao(req, res);
    }

    // Rota: GET /api/pagamento/:payment_id - Consultar pagamento
    if (method === 'GET' && url.includes('/pagamento/')) {
      const paymentId = url.split('/pagamento/')[1]?.split('?')[0];
      if (paymentId) {
        req.params = { payment_id: paymentId };
        req.query = new URLSearchParams(url.split('?')[1] || '').reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
        return await pagamentoController.consultarPagamento(req, res);
      }
    }

    // Rota padrão POST /api/pagamento/create - Criar pagamento PIX (compatibilidade)
    if (method === 'POST') {
      req.body = body;
      
      // Se tem método de pagamento especificado
      if (body.metodo === 'cartao' || body.cartao) {
        return await pagamentoController.criarPagamentoCartao(req, res);
      }
      
      // Padrão: PIX
      return await pagamentoController.criarPagamentoPIX(req, res);
    }

    return res.status(405).json({ message: 'Método não permitido' });

  } catch (err) {
    console.error('Erro em /api/pagamento:', err);
    return res.status(500).json({ 
      error: 'Erro no servidor',
      message: err.message 
    });
  }
}
