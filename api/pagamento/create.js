// api/pagamento/create.js
// Importação dinâmica para evitar problemas de resolução de caminhos no Vercel
let pagamentoControllerPromise = null;

async function loadPagamentoController() {
  if (!pagamentoControllerPromise) {
    pagamentoControllerPromise = (async () => {
      let pagamentoModule;
      
      // Tenta primeiro com caminho relativo a partir de api/pagamento/ (../../back-end)
      // De api/pagamento/create.js para back-end/api/controllers = ../../back-end/api/controllers
      try {
        console.log('[Pagamento] Tentando carregar de: ../../back-end/api/controllers/pagamentoController.js');
        pagamentoModule = await import('../../back-end/api/controllers/pagamentoController.js');
        console.log('[Pagamento] ✅ Sucesso ao carregar de: ../../back-end');
      } catch (primaryError) {
        // Se falhar, tenta com caminho a partir de api/ (../back-end) - mesmo padrão do auth.js
        try {
          console.log('[Pagamento] Tentando carregar de: ../back-end/api/controllers/pagamentoController.js');
          pagamentoModule = await import('../back-end/api/controllers/pagamentoController.js');
          console.log('[Pagamento] ✅ Sucesso ao carregar de: ../back-end');
        } catch (fallbackError) {
          // Último fallback: tenta caminho alternativo
          try {
            console.log('[Pagamento] Tentando carregar de: ../../../back-end/api/controllers/pagamentoController.js');
            pagamentoModule = await import('../../../back-end/api/controllers/pagamentoController.js');
            console.log('[Pagamento] ✅ Sucesso ao carregar de: ../../../back-end');
          } catch (lastError) {
            console.error('[Pagamento] Falha ao carregar controller (todas tentativas):', {
              primary: primaryError.message,
              fallback: fallbackError.message,
              last: lastError.message
            });
            throw new Error(`Não foi possível carregar pagamentoController. Último erro: ${lastError.message}`);
          }
        }
      }
      
      return pagamentoModule.default || pagamentoModule;
    })();
  }
  return pagamentoControllerPromise;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    // se já foi parseado pelo Vercel/Next, retorna
    if (req.body && typeof req.body === "object") return resolve(req.body);

    let data = "";
    req.on?.("data", (chunk) => (data += chunk));
    req.on?.("end", () => {
      if (!data) return resolve({});
      try {
        return resolve(JSON.parse(data));
      } catch (err) {
        // fallback urlencoded
        const ct = (req.headers && req.headers["content-type"]) || "";
        if (ct.includes("application/x-www-form-urlencoded")) {
          try {
            const obj = Object.fromEntries(new URLSearchParams(data));
            return resolve(obj);
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

// Wrapper para garantir que sempre retornamos JSON, mesmo em erros fatais
function safeJsonResponse(res, status, data) {
  try {
    if (!res.headersSent) {
      res.status(status);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.json(data);
    }
  } catch (e) {
    console.error('[Pagamento] Erro ao enviar resposta JSON:', e);
    try {
      if (!res.headersSent) {
        res.status(status);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      }
    } catch (finalError) {
      console.error('[Pagamento] Erro fatal ao enviar resposta:', finalError);
    }
  }
}

export default async function handler(req, res) {
  // Garante que sempre retornamos JSON, mesmo em caso de erro fatal
  const sendJsonError = (status, error, message) => {
    return safeJsonResponse(res, status, { error, message });
  };

  // Wrapper global para capturar qualquer erro não tratado
  try {
    const { method, url } = req || {};
    
    if (!method || !url) {
      return sendJsonError(400, 'Requisição inválida', 'Method ou URL não fornecidos');
    }

    // Carrega o controller dinamicamente
    let pagamentoController;
    try {
      pagamentoController = await loadPagamentoController();
    } catch (loadError) {
      console.error('[Pagamento] Erro fatal ao carregar controller:', loadError);
      return sendJsonError(500, 'Erro ao carregar módulo de pagamento', loadError.message);
    }
    
    let body;
    try {
      body = await parseBody(req);
      req.body = body;
    } catch (parseError) {
      console.error('[Pagamento] Erro ao parsear body:', parseError);
      return sendJsonError(400, 'Erro ao processar requisição', 'Body inválido ou malformado');
    }

    // rota explícita pix/cartao baseado no caminho final
    // ex: POST /api/pagamento/pix  OR  POST /api/pagamento/create (body.metodo)
    if (method === "POST" && (url.endsWith("/pix") || url.includes("/pagamento/pix"))) {
      return await pagamentoController.criarPagamentoPIX(req, res);
    }

    if (method === "POST" && (url.endsWith("/cartao") || url.includes("/pagamento/cartao"))) {
      return await pagamentoController.criarPagamentoCartao(req, res);
    }

    // GET /api/pagamento/:id
    if (method === "GET" && url.includes("/pagamento/")) {
      const paymentId = url.split("/pagamento/")[1]?.split("?")[0];
      if (paymentId) {
        req.params = { payment_id: paymentId };
        const qs = url.split("?")[1] || "";
        req.query = {};
        qs.split("&").forEach((p) => {
          if (!p) return;
          const [k, v] = p.split("=");
          req.query[k] = decodeURIComponent(v || "");
        });
        return await pagamentoController.consultarPagamento(req, res);
      }
    }

    // POST genérico: decide pelo body
    if (method === "POST") {
      if (body?.metodo === "cartao" || body?.cartao) {
        return await pagamentoController.criarPagamentoCartao(req, res);
      }
      return await pagamentoController.criarPagamentoPIX(req, res);
    }

    return safeJsonResponse(res, 405, { error: "Método não permitido" });
  } catch (err) {
    console.error("[Pagamento] Erro interno:", err);
    console.error("[Pagamento] Stack trace:", err.stack);
    
    // Sempre retorna JSON válido, mesmo em caso de erro
    return safeJsonResponse(res, 500, { 
      error: "Erro interno no servidor", 
      message: err?.message || "Erro desconhecido",
      type: err?.name || "Error",
      details: process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development' 
        ? err.stack 
        : undefined
    });
  }
}
