// api/pagamento/create.js
import pagamentoController from "../../controllers/pagamentoController.js";

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
    console.error("Erro em /api/pagamento:", err);
    return res.status(500).json({ error: "Erro interno no servidor", message: err?.message });
  }
}
