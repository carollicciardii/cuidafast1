const MensagemModel = require('../models/MensagemModel');
import UsuarioModel from '../models/UsuarioModel.js';
import MensagemModel from '../models/MensagemModel.js';
import db from '../models/db.js';

/**
 * Controller para gerenciar mensagens entre usuários
 */

/**
 * Buscar conversas de um usuário
 * GET /api/mensagens/conversas/:userId
 * Retorna lista de conversas com último contato de cada uma
 */
export const getConversas = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Buscar todas as conversas onde o usuário é remetente ou destinatário
    const query = `
      WITH conversas_unicas AS (
        SELECT DISTINCT
          CASE 
            WHEN m.remetente_id = $1 THEN m.destinatario_id
            ELSE m.remetente_id
          END AS contato_id
        FROM mensagem m
        WHERE m.remetente_id = $1 OR m.destinatario_id = $1
      )
      SELECT 
        cu.contato_id,
        u.nome AS contato_nome,
        u.foto_perfil AS contato_foto,
        CASE 
          WHEN EXISTS (SELECT 1 FROM cuidador WHERE usuario_id = cu.contato_id) THEN 'Cuidador'
          ELSE 'Cliente'
        END AS contato_tipo,
        0 AS mensagens_nao_lidas,
        (
          SELECT MAX(m3.data_envio)
          FROM mensagem m3
          WHERE (m3.remetente_id = $1 AND m3.destinatario_id = cu.contato_id)
             OR (m3.destinatario_id = $1 AND m3.remetente_id = cu.contato_id)
        ) AS ultima_mensagem_data
      FROM conversas_unicas cu
      JOIN usuario u ON u.usuario_id = cu.contato_id
      ORDER BY ultima_mensagem_data DESC NULLS LAST
    `;
    
    const result = await db.query(query, [userId]);
    
    const conversas = result.rows.map(row => ({
      contato_id: row.contato_id,
      contato_nome: row.contato_nome,
      contato_foto: row.contato_foto,
      contato_tipo: row.contato_tipo,
      mensagens_nao_lidas: parseInt(row.mensagens_nao_lidas) || 0
    }));
    
    return res.json({ conversas });
  } catch (err) {
    console.error('[MensagemController] Erro ao buscar conversas:', err);
    return res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
};

/**
 * Buscar mensagens entre dois usuários
 * GET /api/mensagens/mensagens/:userId/:contatoId
 */
export const getMensagens = async (req, res) => {
  try {
    const { userId, contatoId } = req.params;
    
    // Buscar mensagens entre os dois usuários
    const query = `
      SELECT 
        m.id,
        m.remetente_id,
        m.destinatario_id,
        m.conteudo,
        m.data_envio
      FROM mensagem m
      WHERE (m.remetente_id = $1 AND m.destinatario_id = $2)
         OR (m.remetente_id = $2 AND m.destinatario_id = $1)
      ORDER BY m.data_envio ASC
    `;
    
    const result = await db.query(query, [userId, contatoId]);
    
    // Nota: Marcação de mensagens como lidas pode ser implementada futuramente
    // se o campo 'lida' for adicionado à tabela mensagem
    
    const mensagens = result.rows.map(row => ({
      id: row.id,
      remetente_id: row.remetente_id,
      destinatario_id: row.destinatario_id,
      conteudo: row.conteudo,
      data_envio: row.data_envio
    }));
    
    return res.json({ mensagens });
  } catch (err) {
    console.error('[MensagemController] Erro ao buscar mensagens:', err);
    return res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
};

/**
 * Enviar mensagem
 * POST /api/mensagens/enviar
 */
export const enviarMensagem = async (req, res) => {
  try {
    const { remetente_id, destinatario_id, conteudo } = req.body;
    
    if (!remetente_id || !destinatario_id || !conteudo) {
      return res.status(400).json({ message: 'Dados incompletos' });
    }
    
    // Verificar se os usuários existem
    const remetente = await UsuarioModel.getById(remetente_id);
    const destinatario = await UsuarioModel.getById(destinatario_id);
    
    if (!remetente || !destinatario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Criar mensagem
    const mensagemId = await MensagemModel.create({
      remetente_id,
      destinatario_id,
      conteudo: conteudo.trim()
    });
    
    // Buscar mensagem criada
    const mensagem = await MensagemModel.getById(mensagemId);
    
    return res.status(201).json({
      id: mensagem.id,
      remetente_id: mensagem.remetente_id,
      destinatario_id: mensagem.destinatario_id,
      conteudo: mensagem.conteudo,
      data_envio: mensagem.data_envio
    });
  } catch (err) {
    console.error('[MensagemController] Erro ao enviar mensagem:', err);
    return res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
};

// Exportar para uso em serverless functions (ES modules)
export default {
  getConversas,
  getMensagens,
  enviarMensagem
};
