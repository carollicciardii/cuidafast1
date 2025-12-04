const { db, messaging } = require("../config/firebase");

// Serviço para enviar notificações para todos os tokens salvos no Firestore
async function sendNotificationToAll(title, body) {
  // Busca todos os tokens da coleção "tokens"
  const snapshot = await db.collection("tokens").get();
  const tokens = snapshot.docs.map(doc => doc.data().token);

  if (!tokens.length) {
    return { ok: false, msg: "Nenhum token encontrado" };
  }

  // Monta a mensagem de notificação
  const message = {
    notification: { title, body },
    tokens,
  };

  // Envia via FCM
  const response = await messaging.sendMulticast(message);
  return response;
}

module.exports = { sendNotificationToAll };
