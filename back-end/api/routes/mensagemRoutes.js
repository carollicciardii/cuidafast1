const express = require('express');
const router = express.Router();
const mensagemController = require('../controllers/mensagemController');

/**
 * Rotas para mensagens
 * Base: /api/mensagens
 */

// Buscar conversas de um usuário
router.get('/conversas/:userId', mensagemController.getConversas);

// Buscar mensagens entre dois usuários
router.get('/mensagens/:userId/:contatoId', mensagemController.getMensagens);

// Enviar mensagem
router.post('/enviar', mensagemController.enviarMensagem);

module.exports = router;

