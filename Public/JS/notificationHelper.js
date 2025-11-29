/**
 * Helper para enviar notificações push
 * CuidaFast - Sistema de Notificações
 */

const NOTIFICATION_API = 'http://localhost:3000/api/notificacoes';

/**
 * Enviar notificação para um usuário específico
 */
async function notificarUsuario(userId, title, body) {
  try {
    const response = await fetch(`${NOTIFICATION_API}/enviar-usuario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body })
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log(`[Notificação] Enviada para usuário ${userId}`);
      return true;
    } else {
      console.warn(`[Notificação] Falha ao enviar:`, result.msg);
      return false;
    }
  } catch (error) {
    console.error('[Notificação] Erro:', error);
    return false;
  }
}

async function notificarTodos(title, body) {
  try {
    const response = await fetch(`${NOTIFICATION_API}/enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body })
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log(`[Notificação] Enviada para ${result.totalTokens} usuário(s)`);
      return true;
    } else {
      console.warn(`[Notificação] Falha ao enviar:`, result.msg);
      return false;
    }
  } catch (error) {
    console.error('[Notificação] Erro:', error);
    return false;
  }
}

/**
 * Notificações pré-definidas do sistema
 */
const NotificationTemplates = {
  // Notificações para CUIDADOR
  novaSolicitacao: (clienteNome, tipoServico) => ({
    title: '🔔 Nova Solicitação de Serviço!',
    body: `${clienteNome} solicitou um serviço de ${tipoServico}`
  }),

  servicoCancelado: (clienteNome) => ({
    title: '❌ Serviço Cancelado',
    body: `${clienteNome} cancelou a solicitação`
  }),

  novaMensagem: (remetenteNome, preview) => ({
    title: `💬 Nova mensagem de ${remetenteNome}`,
    body: preview
  }),

  avaliacaoRecebida: (nota) => ({
    title: '⭐ Nova Avaliação!',
    body: `Você recebeu ${nota} estrelas em um serviço`
  }),

  // Notificações para CLIENTE
  servicoAceito: (cuidadorNome) => ({
    title: '✅ Serviço Aceito!',
    body: `${cuidadorNome} aceitou sua solicitação`
  }),

  servicoRecusado: (cuidadorNome) => ({
    title: '❌ Serviço Recusado',
    body: `${cuidadorNome} não pode atender sua solicitação`
  }),

  servicoIniciado: (cuidadorNome) => ({
    title: '🚀 Serviço Iniciado',
    body: `${cuidadorNome} iniciou o atendimento`
  }),

  servicoConcluido: (cuidadorNome) => ({
    title: '✅ Serviço Concluído',
    body: `${cuidadorNome} finalizou o atendimento. Avalie o serviço!`
  }),

  // Notificações GERAIS
  lembreteServico: (data, hora) => ({
    title: '⏰ Lembrete de Serviço',
    body: `Você tem um serviço agendado para ${data} às ${hora}`
  }),

  pagamentoRecebido: (valor) => ({
    title: '💰 Pagamento Recebido',
    body: `Você recebeu R$ ${valor.toFixed(2)}`
  })
};

/**
 * Funções específicas para cada evento do sistema
 */
const NotificationEvents = {
  // Quando cliente solicita serviço
  async onNovoServico(cuidadorId, clienteNome, tipoServico) {
    const notif = NotificationTemplates.novaSolicitacao(clienteNome, tipoServico);
    return await notificarUsuario(cuidadorId, notif.title, notif.body);
  },

  // Quando cuidador aceita
  async onServicoAceito(clienteId, cuidadorNome) {
    const notif = NotificationTemplates.servicoAceito(cuidadorNome);
    return await notificarUsuario(clienteId, notif.title, notif.body);
  },

  // Quando cuidador recusa
  async onServicoRecusado(clienteId, cuidadorNome) {
    const notif = NotificationTemplates.servicoRecusado(cuidadorNome);
    return await notificarUsuario(clienteId, notif.title, notif.body);
  },

  // Quando serviço é iniciado
  async onServicoIniciado(clienteId, cuidadorNome) {
    const notif = NotificationTemplates.servicoIniciado(cuidadorNome);
    return await notificarUsuario(clienteId, notif.title, notif.body);
  },

  // Quando serviço é concluído
  async onServicoConcluido(clienteId, cuidadorNome) {
    const notif = NotificationTemplates.servicoConcluido(cuidadorNome);
    return await notificarUsuario(clienteId, notif.title, notif.body);
  },

  // Quando cliente cancela
  async onServicoCancelado(cuidadorId, clienteNome) {
    const notif = NotificationTemplates.servicoCancelado(clienteNome);
    return await notificarUsuario(cuidadorId, notif.title, notif.body);
  },

  // Quando recebe mensagem
  async onNovaMensagem(destinatarioId, remetenteNome, mensagem) {
    const preview = mensagem.length > 50 ? mensagem.substring(0, 50) + '...' : mensagem;
    const notif = NotificationTemplates.novaMensagem(remetenteNome, preview);
    return await notificarUsuario(destinatarioId, notif.title, notif.body);
  },

  // Quando recebe avaliação
  async onAvaliacaoRecebida(cuidadorId, nota) {
    const notif = NotificationTemplates.avaliacaoRecebida(nota);
    return await notificarUsuario(cuidadorId, notif.title, notif.body);
  },

  // Quando recebe pagamento
  async onPagamentoRecebido(cuidadorId, valor) {
    const notif = NotificationTemplates.pagamentoRecebido(valor);
    return await notificarUsuario(cuidadorId, notif.title, notif.body);
  },

  // Lembrete de serviço
  async onLembreteServico(userId, data, hora) {
    const notif = NotificationTemplates.lembreteServico(data, hora);
    return await notificarUsuario(userId, notif.title, notif.body);
  }
};

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    notificarUsuario,
    notificarTodos,
    NotificationTemplates,
    NotificationEvents
  };
}
