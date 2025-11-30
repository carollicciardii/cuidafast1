import pagamentoController from "../../controllers/pagamentoController.js";

export default async function handler(req, res) {
  const { method, url } = req;

  try {
    const body = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => (data += chunk));
      req.on("end", () => {
        try {
          resolve(JSON.parse(data || "{}"));
        } catch (err) {
          reject(err);
        }
      });
      req.on("error", reject);
    });

    req.body = body;

    // Rotas explícitas
    if (method === "POST" && url.endsWith("/pix")) {
      return await pagamentoController.criarPagamentoPIX(req, res);
    }

    if (method === "POST" && url.endsWith("/cartao")) {
      return await pagamentoController.criarPagamentoCartao(req, res);
    }

    // Consulta GET /pagamento/:id
    if (method === "GET" && url.includes("/pagamento/")) {
      const paymentId = url.split("/pagamento/")[1]?.split("?")[0];

      if (paymentId) {
        req.params = { payment_id: paymentId };
        const qs = url.split("?")[1] || "";
        req.query = {};

        qs.split("&").forEach(p => {
          if (!p) return;
          const [k, v] = p.split("=");
          req.query[k] = decodeURIComponent(v || "");
        });

        return await pagamentoController.consultarPagamento(req, res);
      }
    }

    // POST genérico → detecta método automaticamente
    if (method === "POST") {
      if (body.metodo === "cartao" || body.cartao) {
        return await pagamentoController.criarPagamentoCartao(req, res);
      }
      return await pagamentoController.criarPagamentoPIX(req, res);
    }

    return res.status(405).json({ message: "Método não permitido" });
  } catch (err) {
    console.error("Erro em /api/pagamento:", err);
    return res.status(500).json({
      success: false,
      error: "Erro no servidor",
      message: err.message
    });
  }
}
