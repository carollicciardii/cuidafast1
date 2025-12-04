
import { messaging } from "./firebaseAdmin.js";
import supabase from "../models/db.js";

// Serviço para enviar notificações para todos os tokens salvos no Firestore
async function sendNotificationToAll(title, body) {
  // Busca todos os tokens da tabela "tokens"
  const { data: tokensData, error: tokensError } = await supabase
    .from("tokens")
    .select("token");

  if (tokensError) {
    console.error("[NotificationService] Erro ao buscar todos os tokens:", tokensError);
    return { ok: false, msg: "Erro ao buscar tokens" };
  }
  
  const tokens = tokensData.map(doc => doc.token).filter(t => t);

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

/**
 * Envia uma notificação para um usuário específico (cuidador ou cliente).
 * @param {string} usuarioId - ID do usuário (cuidador ou cliente)
 * @param {string} title - Título da notificação
 * @param {string} body - Corpo da notificação
 * @returns {Promise<Object>} Resultado do envio
 */
async function sendNotificationToUser(usuarioId, title, body) {
  // 1. Buscar tokens de notificação do usuário na tabela 'tokens'
  const { data: tokensData, error: tokensError } = await supabase
    .from("tokens")
    .select("token")
    .eq("usuario_id", usuarioId);

  if (tokensError) {
    console.error(`[NotificationService] Erro ao buscar tokens para o usuário ${usuarioId}:`, tokensError);
    return { ok: false, msg: "Erro ao buscar tokens" };
  }

  const tokens = tokensData.map(doc => doc.token).filter(t => t);

  if (!tokens.length) {
    console.warn(`[NotificationService] Nenhum token encontrado para o usuário ${usuarioId}`);
    return { ok: false, msg: "Nenhum token encontrado" };
  }

  // 2. Montar a mensagem de notificação
  const message = {
    notification: { title, body },
    tokens,
  };

  // 3. Enviar via FCM
  try {
    const response = await messaging.sendMulticast(message);
    console.log(`[NotificationService] Notificação enviada para ${tokens.length} tokens do usuário ${usuarioId}. Sucesso: ${response.successCount}, Falha: ${response.failureCount}`);
    return { ok: true, response };
  } catch (error) {
    console.error(`[NotificationService] Erro ao enviar notificação para o usuário ${usuarioId}:`, error);
    return { ok: false, msg: error.message };
  }
}

export { sendNotificationToAll, sendNotificationToUser };
