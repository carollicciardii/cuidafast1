const {
  enviarMensagem,
  getConversas,
  getMensagens,
} = require("../../back-end/api/controllers/mensagemController.js");

module.exports = async function handler(req, res) {
  const { method, url, query } = req;

  try {

    if (url === "/api/mensagens/enviar" && method === "POST") {
      const body = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => {
          try {
            resolve(JSON.parse(data || "{}"));
          } catch (err) {
            reject(err);
          }
        });
        req.on("error", reject);
      });

      const reqWithBody = { ...req, body };
      return await enviarMensagem(reqWithBody, res);
    }


    if (url.startsWith("/api/mensagens/conversas/") && method === "GET") {
      const userId = url.split("/").pop();

      if (!userId) {
        return res.status(400).json({ message: "userId é obrigatório" });
      }

      const reqWithParams = { ...req, params: { userId } };
      return await getConversas(reqWithParams, res);
    }


    if (url.startsWith("/api/mensagens/") && method === "GET") {
      const parts = url.split("/");


      if (parts.length >= 5 && parts[3] && parts[4]) {
        const userId = parts[3];
        const contatoId = parts[4];

        const reqWithParams = { ...req, params: { userId, contatoId } };
        return await getMensagens(reqWithParams, res);
      }
    }

    return res.status(405).json({ message: "Método não permitido" });
  } catch (err) {
    console.error("[Mensagens] Erro interno:", err);
    return res.status(500).json({ message: "Erro interno do servidor", error: err.message });
  }
};
