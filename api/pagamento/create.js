// api/pagamento/create.js

let criarPagamentoController = null;
let pagamentoControllerPromise = null;

// Tenta carregar criarPagamentoController dinamicamente
async function loadCriarPagamentoController() {
  if (!criarPagamentoController) {
    try {
      const mod = await import("../../back-end/api/controllers/pagamentoController.js");
      criarPagamentoController = mod.criarPagamentoController || null;
    } catch (e) {
      console.log('[Pagamento] Não foi possível carregar criarPagamentoController:', e.message);
      criarPagamentoController = null;
    }
  }
  return criarPagamentoController;
}

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
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const body = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => (data += chunk));
      req.on("end", () => resolve(JSON.parse(data)));
      req.on("error", reject);
    });

    // Tenta usar criarPagamentoController se disponível, senão usa o controller padrão
    const criarPagamentoFn = await loadCriarPagamentoController();
    if (criarPagamentoFn && typeof criarPagamentoFn === 'function') {
      try {
        const resultado = await criarPagamentoFn(body);
        return res.status(200).json(resultado);
      } catch (controllerError) {
        console.error('[Pagamento] Erro ao chamar criarPagamentoController:', controllerError);
        // Continua para o fallback
      }
    }

    // Fallback para o sistema de roteamento existente
    const controller = await loadPagamentoController();
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

  } catch (erro) {
    console.error("Erro create.js:", erro);
    return res.status(500).json({ erro: "Erro interno", detalhe: erro.message });
  }
}