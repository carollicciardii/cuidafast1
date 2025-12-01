// controllers/pagamentoController.js
import mercadopagoService from "../services/mercadoPagoService.js";
import PagamentoModel from "../models/PagamentoModel.js"; // assume existe
import supabase from "../models/db.js"; // supabase client (mesma fonte do PagamentoModel)

// Busca dados completos do cliente (cliente + usuario)
// retorna { nome, email, telefone, cpf, endereco } ou null
async function getClienteCompletoByUsuarioId(usuarioId) {
  if (!usuarioId) return null;

  // pega dados da tabela cliente
  const { data: clienteData, error: clienteErr } = await supabase
    .from("cliente")
    .select("endereco")
    .eq("usuario_id", usuarioId)
    .single();

  if (clienteErr && clienteErr.code !== "PGRST116") {
    console.warn("[getClienteCompleto] erro ao buscar cliente:", clienteErr);
  }

  // pega dados da tabela usuario (nome, email, telefone, cpf) -- ajuste campos se diferente
  const { data: usuarioData, error: usuarioErr } = await supabase
    .from("usuario")
    .select("usuario_id, nome, email, telefone, cpf")
    .eq("usuario_id", usuarioId)
    .single();

  if (usuarioErr && usuarioErr.code !== "PGRST116") {
    console.warn("[getClienteCompleto] erro ao buscar usuario:", usuarioErr);
  }

  if (!usuarioData && !clienteData) return null;

  return {
    id: usuarioId,
    nome: usuarioData?.nome || null,
    email: usuarioData?.email || null,
    telefone: usuarioData?.telefone || null,
    cpf: usuarioData?.cpf || null,
    endereco: clienteData?.endereco ? parseEnderecoIfNeeded(clienteData.endereco) : undefined
  };
}

// tenta parsear o campo endereco se for JSON/texto; se não, retorna como está
function parseEnderecoIfNeeded(enderecoField) {
  if (!enderecoField) return undefined;
  try {
    // se for JSON string
    if (typeof enderecoField === "string") {
      const trimmed = enderecoField.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        return JSON.parse(trimmed);
      }
    }
  } catch (e) {
    // não é JSON, retorna original
  }
  return enderecoField;
}

async function criarPagamentoPIX(req, res) {
  try {
    const { valor, descricao, cliente, usuario, idUsuario, consulta_id, contratar_id, cuidador_id } = req.body;

    if (!valor || Number(valor) <= 0) {
      return res.status(400).json({ error: "Valor do pagamento é obrigatório e deve ser maior que zero" });
    }
    if (!descricao) {
      return res.status(400).json({ error: "Descrição do pagamento é obrigatória" });
    }

    // monta dados do cliente:
    let dadosCliente = cliente || usuario || null;

    // se não chegou dados do cliente, tenta buscar pelo idUsuario (usuario_id)
    if (!dadosCliente && idUsuario) {
      const fetched = await getClienteCompletoByUsuarioId(idUsuario);
      if (fetched) {
        dadosCliente = fetched;
      }
    }

    // se ainda não tem cliente e não tem idUsuario, tenta ver se req.user (auth middleware) existe
    if (!dadosCliente && req.user?.id) {
      const fetched = await getClienteCompletoByUsuarioId(req.user.id);
      if (fetched) dadosCliente = fetched;
    }

    // monta usuarioId para salvar no DB
    const usuarioId = (dadosCliente && (dadosCliente.id || dadosCliente.usuario_id)) || idUsuario || null;
    const externalReference = `pix_${usuarioId || "user"}_${Date.now()}`;

    // chama Mercado Pago
    const resultadoMercadoPago = await mercadopagoService.criarPagamentoPIX(
      Number(valor),
      descricao,
      dadosCliente || {},
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
    return res.status(500).json({ error: "Erro interno ao processar pagamento", message: error.message });
  }
}

async function consultarPagamento(req, res) {
  try {
    const { payment_id } = req.params || {};
    const { mercado_pago_id } = req.query || {};

    if (!payment_id && !mercado_pago_id) {
      return res.status(400).json({ error: "ID do pagamento é obrigatório" });
    }

    const mpId = mercado_pago_id || payment_id;
    const resultado = await mercadopagoService.consultarPagamento(mpId);

    if (!resultado.success) {
      return res.status(500).json({ error: resultado.error || "Erro ao consultar pagamento" });
    }

    // Se temos id interno, atualizamos por id. Se não, atualizamos por referencia (id do MP)
    if (payment_id && !mercado_pago_id) {
      try {
        const pagamento = await PagamentoModel.getById(payment_id);
        if (pagamento) {
          await PagamentoModel.update(payment_id, {
            status: resultado.data.status.toUpperCase(),
            referencia: String(resultado.data.id),
            data_pagamento: new Date().toISOString()
          });
        }
      } catch (dbError) {
        console.warn("[PagamentoController] Erro ao atualizar status no banco:", dbError);
      }
    } else {
      // atualização por referencia
      try {
        // tenta atualizar registros onde referencia == mpId
        const { data: upData, error: upErr } = await supabase
          .from("pagamento")
          .update({
            status: resultado.data.status.toUpperCase(),
            referencia: String(resultado.data.id),
            data_pagamento: new Date().toISOString()
          })
          .eq("referencia", String(resultado.data.id));

        if (upErr) {
          console.warn("[PagamentoController] Erro ao atualizar pagamento por referencia:", upErr);
        }
      } catch (e) {
        console.warn("[PagamentoController] erro ao atualizar por referencia:", e);
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
    return res.status(500).json({ error: "Erro interno ao consultar pagamento", message: error.message });
  }
}

async function criarPagamentoCartao(req, res) {
  return res.status(501).json({ error: "Pagamento por cartão não implementado" });
}

export default {
  criarPagamentoPIX,
  consultarPagamento,
  criarPagamentoCartao
};
