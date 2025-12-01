// api/pagamento/create.js
// Importação dinâmica para evitar problemas de resolução de caminhos no Vercel
let pagamentoControllerPromise = null;

async function loadPagamentoController() {
  if (!pagamentoControllerPromise) {
    pagamentoControllerPromise = (async () => {
      let pagamentoModule;
      const paths = [
        "../../back-end/api/controllers/pagamentoController.js",
        "../back-end/api/controllers/pagamentoController.js",
        "../../../back-end/api/controllers/pagamentoController.js"
      ];
      
      let lastError = null;
      for (const path of paths) {
        try {
          console.log(`[Pagamento] Tentando carregar de: ${path}`);
          pagamentoModule = await import(path);
          console.log(`[Pagamento] ✅ Sucesso ao carregar de: ${path}`);
          break;
        } catch (err) {
          console.warn(`[Pagamento] ❌ Falha ao carregar de ${path}:`, err.message);
          lastError = err;
        }
      }
      
      if (!pagamentoModule) {
        console.error("[Pagamento] Erro ao carregar pagamentoController - todas as tentativas falharam");
        throw new Error(`Não foi possível carregar pagamentoController. Último erro: ${lastError?.message}`);
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

export default async function handler(req, res) {
  const { method, url } = req;

  try {
    // Carrega o controller dinamicamente
    const pagamentoController = await loadPagamentoController();
    
    const body = await parseBody(req);
    req.body = body;

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

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("[Pagamento] Erro interno:", err);
    // Sempre retorna JSON válido, mesmo em caso de erro
    try {
      return res.status(500).json({ 
        error: "Erro interno no servidor", 
        message: err?.message || "Erro desconhecido",
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    } catch (jsonError) {
      // Se falhar ao enviar JSON, tenta enviar texto simples
      console.error("[Pagamento] Erro ao enviar resposta JSON:", jsonError);
      if (!res.headersSent) {
        res.status(500);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: "Erro interno no servidor" }));
      }
    }
  }
}
