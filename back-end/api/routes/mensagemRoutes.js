const express = require('express');
import { getConversas, getMensagens, enviarMensagem } from '../controllers/mensagemController.js';

/**
 * Rotas para mensagens
 * Base: /api/mensagens
 */

// O arquivo de rotas não é necessário, pois o vercel.json mapeia para api/mensagens.js.
// Vou criar o handler em api/mensagens.js.

