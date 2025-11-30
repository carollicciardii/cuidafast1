const ClienteModel = require('../models/ClienteModel');
const UsuarioModel = require('../models/UsuarioModel');

/**
 * Salvar/Atualizar dados complementares do cliente
 */
exports.salvarDadosComplementares = async (req, res) => {
  try {
    const { userId, endereco, dataNascimento, cpf } = req.body;
    
    if (!userId || !endereco) {
      return res.status(400).json({ message: 'userId e endereco são obrigatórios' });
    }

    // Verificar se cliente já existe
    const clienteExistente = await ClienteModel.getById(userId);
    
    if (clienteExistente) {
      // Atualizar cliente existente
      await ClienteModel.update(userId, {
        endereco: JSON.stringify(endereco),
        preferencias: null,
        historico_contratacoes: null
      });
    } else {
      // Criar novo registro de cliente
      await ClienteModel.create({
        usuario_id: userId,
        endereco: JSON.stringify(endereco),
        preferencias: null,
        historico_contratacoes: null
      });
    }

    // Atualizar também dados do usuário (se necessário)
    // await UsuarioModel.update(userId, { data_nascimento: dataNascimento });

    return res.json({ 
      message: 'Dados salvos com sucesso',
      endereco: endereco
    });
  } catch (err) {
    console.error('[ClienteController] Erro ao salvar dados:', err);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

module.exports = exports;
