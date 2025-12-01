import NotificacaoModel from "../back-end/api/models/NotificacaoModel.js";

function getUrlObject(req) {
  try {
    return new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch (error) {
    return new URL(`http://localhost${req.url}`);
  }
}

function normalizeUserId(rawId) {
  if (!rawId) return null;
  const parsed = parseInt(rawId, 10);
  return Number.isNaN(parsed) ? rawId : parsed;
}

export default async function handler(req, res) {
  try {
    const urlObj = getUrlObject(req);
    const pathname = urlObj.pathname;
    const method = req.method;

    if (method === "GET" && pathname.startsWith("/api/notificacoes/usuario")) {
      const segments = pathname.split("/").filter(Boolean);
      // Expected: ['api','notificacoes','usuario',':id','nao-lidas?']
      let userId = segments[3] || urlObj.searchParams.get("id") || urlObj.searchParams.get("usuario_id");
      const filterParam = segments[4] || urlObj.searchParams.get("filter");
      const limitParam = parseInt(urlObj.searchParams.get("limit") || "20", 10);

      userId = normalizeUserId(userId);
      if (!userId) {
        return res.status(400).json({ error: "ID do usuário é obrigatório" });
      }

      const limit = Number.isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 100);
      const normalizedFilter =
        filterParam === "nao-lidas" || filterParam === "nao_lidas" ? "nao_lidas" : undefined;

      const notificacoes = await NotificacaoModel.getByUsuarioId(userId, {
        filter: normalizedFilter,
        limit
      });

      let unreadCount = notificacoes.length;
      if (normalizedFilter !== "nao_lidas") {
        unreadCount = await NotificacaoModel.countUnreadByUsuarioId(userId);
      }

      const countValue = normalizedFilter === "nao_lidas" ? notificacoes.length : unreadCount;

      return res.status(200).json({
        count: countValue,
        total: notificacoes.length,
        unreadCount,
        notificacoes
      });
    }

    if (method === "PATCH" && pathname.startsWith("/api/notificacoes/") && pathname.endsWith("/lida")) {
      const segments = pathname.split("/").filter(Boolean);
      const notificationId = segments[2];

      if (!notificationId) {
        return res.status(400).json({ error: "ID da notificação é obrigatório" });
      }

      const updated = await NotificacaoModel.markAsRead(notificationId);
      return res.status(200).json({ updated });
    }

    if (method === "POST" && pathname.endsWith("/marcar-todas-lidas")) {
      const segments = pathname.split("/").filter(Boolean);
      const userId = normalizeUserId(segments[3] || urlObj.searchParams.get("id"));

      if (!userId) {
        return res.status(400).json({ error: "ID do usuário é obrigatório" });
      }

      const updated = await NotificacaoModel.markAllAsRead(userId);
      return res.status(200).json({ updated });
    }

    return res.status(404).json({ error: "Rota de notificações não encontrada" });
  } catch (error) {
    console.error("[Notificacoes] Erro interno:", error);
    return res.status(500).json({ error: "Erro interno do servidor", message: error.message });
  }
}

