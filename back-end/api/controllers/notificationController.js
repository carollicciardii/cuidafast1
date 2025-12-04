const { sendNotificationToAll } = require("../services/notificationService");

async function sendNotification(req, res) {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ ok: false, msg: "Título e corpo obrigatórios" });

    const response = await sendNotificationToAll(title, body);
    res.json({ ok: true, response });
  } catch (error) {
    console.error("Erro ao enviar notificação:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = { sendNotification };
