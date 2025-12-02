// api/pagamento/create.js

let pagamentoControllerPromise = null;

async function loadPagamentoController() {
  if (!pagamentoControllerPromise) {
    pagamentoControllerPromise = (async () => {
      // O caminho mais provável para o Vercel é o primeiro.
      // Se falhou, pode ser que o Vercel tenha "achatado" a estrutura.
      // Vamos tentar o caminho mais provável primeiro.
      const paths = [
        '../../back-end/api/controllers/pagamentoController.js'
      ];

      for (const p of paths) {
        try {
          console.log('[Pagamento] Tentando carregar:', p);
          const mod = await import(p);
          console.log('[Pagamento] Sucesso ao carregar controller de:', p);
          return mod.default || mod;
        } catch (e) {
          console.log('[Pagamento] Falhou em:', p);
        }
      }

      throw new Error("Não foi possível carregar pagamentoController em nenhum caminho.");
    })();
  }
  return pagamentoControllerPromise;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);

    let data = "";
    req.on?.("data", chunk => data += chunk);
    req.on?.("end", () => {
      if (!data) return resolve({});

      try {
        return resolve(JSON.parse(data));
      } catch {
        return resolve({ raw: data }); // nunca quebrar
      }
    });
    req.on?.("error", reject);
  });
}

function safeJson(res, status, obj) {
  try {
    res.status(status);
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(obj));
  } catch (e) {
    console.error("[Pagamento] Erro ao enviar JSON:", e);
  }
}

export default async function handler(req, res) {
  try {
    const controller = await loadPagamentoController();
    const body = await parseBody(req);
    req.body = body;

    const url = req.url || "";
    const method = req.method || "GET";

    // ---- direcionamento de rotas ----

    if (method === "POST" && url.endsWith("/pix")) {
      return controller.criarPagamentoPIX(req, res);
    }

    if (method === "POST" && url.endsWith("/cartao")) {
      return controller.criarPagamentoCartao(req, res);
    }

    if (method === "GET" && url.includes("/pagamento/")) {
      const id = url.split("/pagamento/")[1]?.split("?")[0];
      req.params = { payment_id: id };
      return controller.consultarPagamento(req, res);
    }

    // POST genérico - decide por body
    if (method === "POST") {
      if (body.metodo === "cartao") {
        return controller.criarPagamentoCartao(req, res);
      }
      return controller.criarPagamentoPIX(req, res);
    }

    return safeJson(res, 405, { error: "Método não permitido" });

  } catch (err) {
    console.error("[Pagamento] ERRO FATAL:", err);
    return safeJson(res, 500, {
      error: "Erro interno no pagamento",
      message: err.message || "Falha desconhecida"
    });
  }
}