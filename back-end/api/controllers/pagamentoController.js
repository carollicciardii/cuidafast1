const mercadopagoService = require('../services/mercadopago.service');
const PagamentoModel = require('../models/PagamentoModel');

/**
 * Cria um pagamento PIX via Mercado Pago
 */
exports.criarPagamentoPIX = async (req, res) => {
  try {
    const { valor, descricao, cliente, usuario, idUsuario, consulta_id, contratar_id, cuidador_id } = req.body;

    // Validações
    if (!valor || valor <= 0) {
      return res.status(400).json({ error: 'Valor do pagamento é obrigatório e deve ser maior que zero' });
    }

    if (!descricao) {
      return res.status(400).json({ error: 'Descrição do pagamento é obrigatória' });
    }

    // Busca dados do cliente - aceita tanto 'cliente' quanto 'usuario' do body
    let dadosCliente = cliente || usuario || {};
    
    // Se idUsuario foi enviado separadamente, usa ele
    if (idUsuario && !dadosCliente.id) {
      dadosCliente.id = idUsuario;
    }
    
    if (!dadosCliente.email && !dadosCliente.id) {
      console.warn('[PagamentoController] Dados do cliente incompletos - email ou id não fornecido');
    }

    // Gera referência externa única
    const usuarioId = dadosCliente.id || idUsuario || null;
    const externalReference = `pix_${usuarioId || 'user'}_${Date.now()}`;

    // Cria pagamento PIX no Mercado Pago
    const resultadoMercadoPago = await mercadopagoService.criarPagamentoPIX(
      valor,
      descricao,
      dadosCliente,
      externalReference
    );

    if (!resultadoMercadoPago.success) {
      return res.status(500).json({
        error: resultadoMercadoPago.error || 'Erro ao criar pagamento PIX',
        details: resultadoMercadoPago.details
      });
    }

    // Salva pagamento no banco de dados
    const dadosPagamento = {
      consulta_id: consulta_id || null,
      contratar_id: contratar_id || null,
      cliente_id: usuarioId || null,
      cuidador_id: cuidador_id || null,
      data_pagamento: new Date().toISOString(),
      valor: valor,
      metodo_pagamento: 'PIX',
      status: resultadoMercadoPago.data.status === 'pending' ? 'PENDENTE' : resultadoMercadoPago.data.status.toUpperCase(),
      referencia: resultadoMercadoPago.data.id.toString()
    };

    let pagamentoId = null;
    try {
      pagamentoId = await PagamentoModel.create(dadosPagamento);
    } catch (dbError) {
      console.error('[PagamentoController] Erro ao salvar pagamento no banco:', dbError);
      // Continua mesmo se não conseguir salvar no banco
    }

    return res.status(200).json({
      success: true,
      init_point: resultadoMercadoPago.data.ticket_url, // Para compatibilidade com frontend
      pagamento: {
        id: pagamentoId,
        mercado_pago_id: resultadoMercadoPago.data.id,
        status: resultadoMercadoPago.data.status,
        qr_code: resultadoMercadoPago.data.qr_code,
        qr_code_base64: resultadoMercadoPago.data.qr_code_base64,
        ticket_url: resultadoMercadoPago.data.ticket_url,
        init_point: resultadoMercadoPago.data.ticket_url, // Alias para ticket_url
        external_reference: resultadoMercadoPago.data.external_reference,
        valor: valor,
        valor_centavos: resultadoMercadoPago.data.transaction_amount,
        data_criacao: resultadoMercadoPago.data.date_created,
        data_expiracao: resultadoMercadoPago.data.date_of_expiration
      }
    });

  } catch (error) {
    console.error('[PagamentoController] Erro ao criar pagamento PIX:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar pagamento',
      message: error.message
    });
  }
};

/**
 * Consulta o status de um pagamento
 */
exports.consultarPagamento = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { mercado_pago_id } = req.query;

    if (!payment_id && !mercado_pago_id) {
      return res.status(400).json({ error: 'ID do pagamento é obrigatório' });
    }

    // Se tiver ID do Mercado Pago, consulta direto lá
    const mpId = mercado_pago_id || payment_id;
    const resultado = await mercadopagoService.consultarPagamento(mpId);

    if (!resultado.success) {
      return res.status(500).json({
        error: resultado.error || 'Erro ao consultar pagamento'
      });
    }

    // Se tiver ID interno, atualiza no banco
    if (payment_id && !mercado_pago_id) {
      try {
        const pagamento = await PagamentoModel.getById(payment_id);
        if (pagamento) {
          await PagamentoModel.update(payment_id, {
            status: resultado.data.status.toUpperCase(),
            referencia: resultado.data.id.toString()
          });
        }
      } catch (dbError) {
        console.warn('[PagamentoController] Erro ao atualizar status no banco:', dbError);
      }
    }

    return res.status(200).json({
      success: true,
      pagamento: {
        id: resultado.data.id,
        status: resultado.data.status,
        status_detail: resultado.data.status_detail,
        valor: resultado.data.transaction_amount / 100, // Converte de centavos para reais
        data_criacao: resultado.data.date_created,
        data_aprovacao: resultado.data.date_approved,
        external_reference: resultado.data.external_reference
      }
    });

  } catch (error) {
    console.error('[PagamentoController] Erro ao consultar pagamento:', error);
    return res.status(500).json({
      error: 'Erro interno ao consultar pagamento',
      message: error.message
    });
  }
};

/**
 * Cria um pagamento com cartão de crédito via Mercado Pago
 */
exports.criarPagamentoCartao = async (req, res) => {
  try {
    const { valor, descricao, cartao, cliente, consulta_id, contratar_id, cuidador_id } = req.body;

    // Validações
    if (!valor || valor <= 0) {
      return res.status(400).json({ error: 'Valor do pagamento é obrigatório e deve ser maior que zero' });
    }

    if (!descricao) {
      return res.status(400).json({ error: 'Descrição do pagamento é obrigatória' });
    }

    if (!cartao || !cartao.token) {
      return res.status(400).json({ error: 'Token do cartão é obrigatório' });
    }

    // Gera referência externa única
    const usuarioId = cliente?.id || null;
    const externalReference = `card_${usuarioId || 'user'}_${Date.now()}`;

    // Cria pagamento com cartão no Mercado Pago
    const resultadoMercadoPago = await mercadopagoService.criarPagamentoCartao(
      valor,
      descricao,
      cartao,
      cliente || {},
      externalReference
    );

    if (!resultadoMercadoPago.success) {
      return res.status(500).json({
        error: resultadoMercadoPago.error || 'Erro ao criar pagamento com cartão',
        details: resultadoMercadoPago.details
      });
    }

    // Salva pagamento no banco de dados
    const dadosPagamento = {
      consulta_id: consulta_id || null,
      contratar_id: contratar_id || null,
      cliente_id: usuarioId || null,
      cuidador_id: cuidador_id || null,
      data_pagamento: new Date().toISOString(),
      valor: valor,
      metodo_pagamento: 'CARTAO_CREDITO',
      status: resultadoMercadoPago.data.status === 'approved' ? 'APROVADO' : resultadoMercadoPago.data.status.toUpperCase(),
      referencia: resultadoMercadoPago.data.id.toString()
    };

    let pagamentoId = null;
    try {
      pagamentoId = await PagamentoModel.create(dadosPagamento);
    } catch (dbError) {
      console.error('[PagamentoController] Erro ao salvar pagamento no banco:', dbError);
    }

    return res.status(200).json({
      success: true,
      pagamento: {
        id: pagamentoId,
        mercado_pago_id: resultadoMercadoPago.data.id,
        status: resultadoMercadoPago.data.status,
        status_detail: resultadoMercadoPago.data.status_detail,
        external_reference: resultadoMercadoPago.data.external_reference,
        valor: valor,
        valor_centavos: resultadoMercadoPago.data.transaction_amount,
        data_criacao: resultadoMercadoPago.data.date_created
      }
    });

  } catch (error) {
    console.error('[PagamentoController] Erro ao criar pagamento com cartão:', error);
    return res.status(500).json({
      error: 'Erro interno ao processar pagamento',
      message: error.message
    });
  }
};

module.exports = exports;

