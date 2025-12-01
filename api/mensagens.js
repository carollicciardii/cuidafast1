let mensagemControllerPromise = null;

async function loadMensagemController() {
  if (!mensagemControllerPromise) {
    mensagemControllerPromise = (async () => {
      try {
        const mod = await import("../back-end/api/controllers/mensagemController.js");
        return mod.default || mod;
      } catch (primaryError) {
        try {
          const fallbackMod = await import("../../back-end/api/controllers/mensagemController.js");
          return fallbackMod.default || fallbackMod;
        } catch (fallbackError) {
          console.error("[Mensagens] Falha ao carregar controller:", primaryError, fallbackError);
          throw fallbackError;
        }
      }
    })();
  }

  return mensagemControllerPromise;
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let data = "";
    req.on?.("data", (chunk) => (data += chunk));
    req.on?.("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on?.("error", reject);
  });
}

export default async function handler(req, res) {
  const { method, url } = req;

  try {
    const { enviarMensagem, getConversas, getMensagens } = await loadMensagemController();

    if (url === "/api/mensagens/enviar" && method === "POST") {
      const body = await parseJsonBody(req);
      const reqWithBody = { ...req, body };
      return await enviarMensagem(reqWithBody, res);
    }

    if (url.startsWith("/api/mensagens/conversas") && method === "GET") {
      const parts = url.split("?");
      const pathParts = parts[0].split("/").filter(Boolean);

      // pathParts example: ['api','mensagens','conversas','49']
      let userId = pathParts[3];
      if (!userId) {
        const searchParams = new URLSearchParams(parts[1] || "");
        userId = searchParams.get("id") || searchParams.get("userId");
      }

      if (!userId) {
        return res.status(400).json({ message: "userId é obrigatório" });
      }

      const reqWithParams = { ...req, params: { userId } };
      return await getConversas(reqWithParams, res);
    }

    if (url.startsWith("/api/mensagens/") && method === "GET") {
      const pathParts = url.split("?")[0].split("/").filter(Boolean);

      if (pathParts.length >= 4) {
        const userId = pathParts[2];
        const contatoId = pathParts[3];

        if (userId && contatoId) {
          const reqWithParams = { ...req, params: { userId, contatoId } };
          return await getMensagens(reqWithParams, res);
        }
      }
    }

    return res.status(405).json({ message: "Método não permitido" });
  } catch (err) {
    console.error("[Mensagens] Erro interno:", err);
    return res.status(500).json({ message: "Erro interno do servidor", error: err.message });
  }
}
