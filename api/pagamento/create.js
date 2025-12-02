// api/pagamento/create.js
// Importação fixa e direta
let pagamentoControllerPromise = null;

async function loadPagamentoController() {
  if (!pagamentoControllerPromise) {
    pagamentoControllerPromise = (async () => {
      try {
        console.log('[Pagamento] Carregando controller de pagamento...');
        const module = await import('../../back-end/api/controllers/pagamentoController.js');
        console.log('[Pagamento] ✅ Controller carregado com sucesso');
        return module.default || module;
      } catch (err) {
        console.error('[Pagamento] ❌ Erro ao carregar pagamentoController:', err);
        throw new Error(`Falha ao importar pagamentoController: ${err.message}`);
      }
    })();
  }
  return pagamentoControllerPromise;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);

    let data = "";
    req.on?.("data", (chunk) => (data += chunk));
    req.on?.("end", () => {
      if (!data) return resolve({});
      try {
        return resolve(JSON.parse(data));
      } catch (err) {
        const ct = req.headers?.["content-type"] || "";
        if (ct.includes("application/x-www-form-urlencoded")) {
          try {
            return resolve(Object.fromEntries(new URLSearchParams(data)));
          } catch (e) {
            return reject(err);
          }
        }
        return reject(err);
      }
    });
    req.on?.("error", reject);
  });
}

function safeJsonResponse(res, status, data) {
  try {
    if (!res.headersSent) {
      res.status(status);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.json(data);
    }
  } catch (e) {
    console.error('[Pagamento] Erro ao enviar JSON:', e);
    if (!res.headersSent) {
      res.status(status);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    }
  }
}

export default async function handler(req, res) {
  const sendJsonError = (status, error, message) =>
    safeJsonResponse(res, status, { error, message });

  try {
    const { method, url } = req || {};

    if (!method || !url) {
      return sendJsonError(400, 'Requisição inválida', 'Method ou URL ausentes');
    }

    let pagamentoController;
    try {
      pagamentoController = await loadPagamentoController();
    } catch (err) {
      return sendJsonError(500, 'Erro ao carregar controller', err.message);
    }

    let body;
    try {
      body = await parseBody(req);
      req.body = body;
    } catch (err) {
      return sendJsonError(400, 'Body inválido', 'JSON malformado');
    }

    // ------------------------------
    // ROTAS
    // ------------------------------

    // PIX explícito
    if (method === "POST" && (url.endsWith("/pix") || url.includes("/pagamento/pix"))) {
      return pagamentoController.criarPagamentoPIX(req, res);
    }

    // Cartão explícito
    if (method === "POST" && (url.endsWith("/cartao") || url.includes("/pagamento/cartao"))) {
      return pagamentoController.criarPagamentoCartao(req, res);
    }

    // Consultar pagamento GET /api/pagamento/:id
    if (method === "GET" && url.includes("/pagamento/")) {
      const paymentId = url.split("/pagamento/")[1]?.split("?")[0];
      if (paymentId) {
        req.params = { payment_id: paymentId };
        req.query = {};
        const qs = url.split("?")[1] || "";
        qs.split("&").forEach((p) => {
          const [k, v] = p.split("=");
          if (k) req.query[k] = decodeURIComponent(v || "");
        });
        return pagamentoController.consultarPagamento(req, res);
      }
    }

    // POST genérico /api/pagamento/create
    if (method === "POST") {
      if (body?.metodo === "cartao" || body?.cartao) {
        return pagamentoController.criarPagamentoCartao(req, res);
      }
      return pagamentoController.criarPagamentoPIX(req, res);
    }

    return safeJsonResponse(res, 405, { error: "Método não permitido" });

  } catch (err) {
    return safeJsonResponse(res, 500, {
      error: "Erro interno",
      message: err.message || "Erro desconhecido",
      type: err.name || "Error"
    });
  }
}