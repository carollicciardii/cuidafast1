import mercadopagoService from "../services/mercadopago.service.js";
import PagamentoModel from "../models/PagamentoModel.js";

async function criarPagamentoPIX(req, res) {
  try {
    const { valor, descricao, cliente, usuario, idUsuario, consulta_id, contratar_id, cuidador_id } = req.body;

    if (!valor || Number(valor) <= 0) {
      return res.status(400).json({ error: "Valor do pagamento é obrigatório e deve ser maior que zero" });
    }

    if (!descricao) {
      return res.status(400).json({ error: "Descrição do pagamento é obrigatória" });
    }

    let dadosCliente = cliente || usuario || {};
    if (idUsuario && !dadosCliente.id) dadosCliente.id = idUsuario;

    const usuarioId = dadosCliente.id || idUsuario || null;
    const externalReference = `pix_${usuarioId || "user"}_${Date.now()}`;

    const resultadoMercadoPago = await mercadopagoService.criarPagamentoPIX(
      Number(valor),
      descricao,
      dadosCliente,
      externalReference
    );

    if (!resultadoMercadoPago.success) {
      return res.status(500).json({
        error: resultadoMercadoPago.error || "Erro ao criar pagamento PIX",
        details: resultadoMercadoPago.details
      });
    }

    const mp = resultadoMercadoPago.data;

    const dadosPagamento = {
      consulta_id: consulta_id || null,
      contratar_id: contratar_id || null,
      cliente_id: usuarioId || null,
      cuidador_id: cuidador_id || null,
      data_pagamento: new Date().toISOString(),
      valor: Number(valor),
      metodo_pagamento: "PIX",
      status: mp.status ? mp.status.toUpperCase() : "PENDENTE",
      referencia: String(mp.id),
      external_reference: mp.external_reference || externalReference
    };

    let pagamentoId = null;
    try {
      pagamentoId = await PagamentoModel.create(dadosPagamento);
    } catch (dbError) {
      console.error("[PagamentoController] Erro ao salvar pagamento no banco:", dbError);
    }

    return res.status(200).json({
      success: true,
      init_point: mp.ticket_url || mp.qr_code_base64 || null,
      pagamento: {
        id: pagamentoId,
        mercado_pago_id: mp.id,
        status: mp.status,
        qr_code: mp.qr_code,
        qr_code_base64: mp.qr_code_base64,
        ticket_url: mp.ticket_url,
        external_reference: mp.external_reference,
        valor: Number(valor),
        data_criacao: mp.date_created,
        data_expiracao: mp.date_of_expiration
      }
    });

  } catch (error) {
    console.error("[PagamentoController] Erro ao criar pagamento PIX:", error);
    return res.status(500).json({
      error: "Erro interno ao processar pagamento",
      message: error.message
    });
  }
}

async function consultarPagamento(req, res) {
  try {
    const { payment_id } = req.params;
    const { mercado_pago_id } = req.query;

    if (!payment_id && !mercado_pago_id) {
      return res.status(400).json({ error: "ID do pagamento é obrigatório" });
    }

    const mpId = mercado_pago_id || payment_id;
    const resultado = await mercadopagoService.consultarPagamento(mpId);

    if (!resultado.success) {
      return res.status(500).json({ error: resultado.error || "Erro ao consultar pagamento" });
    }

    if (payment_id && !mercado_pago_id) {
      try {
        const pagamento = await PagamentoModel.getById(payment_id);
        if (pagamento) {
          await PagamentoModel.update(payment_id, {
            status: resultado.data.status.toUpperCase(),
            referencia: String(resultado.data.id)
          });
        }
      } catch (dbError) {
        console.warn("[PagamentoController] Erro ao atualizar status no banco:", dbError);
      }
    }

    return res.status(200).json({
      success: true,
      pagamento: {
        id: resultado.data.id,
        status: resultado.data.status,
        status_detail: resultado.data.status_detail,
        valor: resultado.data.transaction_amount,
        data_criacao: resultado.data.date_created,
        data_aprovacao: resultado.data.date_approved,
        external_reference: resultado.data.external_reference
      }
    });

  } catch (error) {
    console.error("[PagamentoController] Erro ao consultar pagamento:", error);
    return res.status(500).json({
      error: "Erro interno ao consultar pagamento",
      message: error.message
    });
  }
}

export default {
  criarPagamentoPIX,
  consultarPagamento,
  criarPagamentoCartao: async (req, res) => {
    return res.status(500).json({ error: "Pagamento com cartão ainda não implementado" });
  }
};
