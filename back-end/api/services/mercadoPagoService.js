const axios = require('axios');

const MERCADOPAGO_BASE_URL = process.env.MERCADOPAGO_BASE_URL || 'https://api.mercadopago.com/v1';
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!MERCADOPAGO_ACCESS_TOKEN) {
  console.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN não configurado nas variáveis de ambiente');
}

/**
 * Cria um pagamento PIX no Mercado Pago
 * @param {number} valor - Valor em reais (ex: 105.90)
 * @param {string} descricao - Descrição do pagamento
 * @param {Object} cliente - Dados do cliente { nome, email, cpf, telefone, endereco }
 * @param {string} externalReference - Referência externa para rastreamento
 * @returns {Promise<Object>} Resposta da API do Mercado Pago
 */
async function criarPagamentoPIX(valor, descricao, cliente = {}, externalReference = null) {
  try {
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      return { error: 'Token do Mercado Pago não configurado' };
    }

    // Converte valor para centavos (formato que Mercado Pago espera)
    const valorCents = Math.round(valor * 100);

    // Prepara dados do pagador
    const payer = {
      email: cliente.email || 'cliente@exemplo.com',
      first_name: cliente.nome ? cliente.nome.split(' ')[0] : 'Cliente',
      last_name: cliente.nome ? cliente.nome.split(' ').slice(1).join(' ') : '',
      identification: cliente.cpf ? {
        type: 'CPF',
        number: cliente.cpf.replace(/\D/g, '') // Remove formatação
      } : undefined
    };

    // Remove campos undefined
    if (!payer.last_name) delete payer.last_name;
    if (!payer.identification) delete payer.identification;

    // Prepara dados do endereço se disponível
    const address = cliente.endereco ? {
      zip_code: cliente.endereco.cep ? cliente.endereco.cep.replace(/\D/g, '') : undefined,
      street_name: cliente.endereco.rua || undefined,
      street_number: cliente.endereco.numero ? parseInt(cliente.endereco.numero) : undefined,
      neighborhood: cliente.endereco.bairro || undefined,
      city: cliente.endereco.cidade || undefined,
      federal_unit: cliente.endereco.estado || undefined
    } : undefined;

    // Remove campos undefined do endereço
    if (address) {
      Object.keys(address).forEach(key => {
        if (address[key] === undefined) delete address[key];
      });
      if (Object.keys(address).length === 0) delete address;
    }

    // Monta o payload do pagamento
    const payload = {
      transaction_amount: valorCents,
      description: descricao || 'Pagamento de serviço',
      payment_method_id: 'pix',
      payer: payer,
      ...(address && { address }),
      notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || undefined,
      external_reference: externalReference || `payment_${Date.now()}`,
      statement_descriptor: 'CUIDAFAST'
    };

    // Remove campos undefined do payload
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) delete payload[key];
    });

    console.log('[MercadoPago] Criando pagamento PIX:', {
      valor: valorCents,
      descricao,
      payer: payer.email
    });

    const response = await axios.post(`${MERCADOPAGO_BASE_URL}/payments`, payload, {
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': externalReference || `pix_${Date.now()}`
      }
    });

    console.log('[MercadoPago] Pagamento PIX criado com sucesso:', response.data.id);

    return {
      success: true,
      data: {
        id: response.data.id,
        status: response.data.status,
        qr_code: response.data.point_of_interaction?.transaction_data?.qr_code || null,
        qr_code_base64: response.data.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        ticket_url: response.data.point_of_interaction?.transaction_data?.ticket_url || null,
        external_reference: response.data.external_reference,
        transaction_amount: response.data.transaction_amount,
        date_created: response.data.date_created,
        date_of_expiration: response.data.date_of_expiration
      }
    };

  } catch (error) {
    console.error('[MercadoPago] Erro ao criar pagamento PIX:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Erro ao criar pagamento PIX',
      details: error.response?.data
    };
  }
}

/**
 * Consulta o status de um pagamento
 * @param {string} paymentId - ID do pagamento no Mercado Pago
 * @returns {Promise<Object>} Status do pagamento
 */
async function consultarPagamento(paymentId) {
  try {
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      return { error: 'Token do Mercado Pago não configurado' };
    }

    const response = await axios.get(`${MERCADOPAGO_BASE_URL}/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      data: {
        id: response.data.id,
        status: response.data.status,
        status_detail: response.data.status_detail,
        transaction_amount: response.data.transaction_amount,
        date_created: response.data.date_created,
        date_approved: response.data.date_approved,
        external_reference: response.data.external_reference
      }
    };

  } catch (error) {
    console.error('[MercadoPago] Erro ao consultar pagamento:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Erro ao consultar pagamento',
      details: error.response?.data
    };
  }
}

/**
 * Cria um pagamento com cartão de crédito
 * @param {number} valor - Valor em reais
 * @param {string} descricao - Descrição do pagamento
 * @param {Object} cartao - Dados do cartão { token, installments, issuer_id, payment_method_id }
 * @param {Object} cliente - Dados do cliente
 * @param {string} externalReference - Referência externa
 * @returns {Promise<Object>} Resposta da API do Mercado Pago
 */
async function criarPagamentoCartao(valor, descricao, cartao, cliente = {}, externalReference = null) {
  try {
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      return { error: 'Token do Mercado Pago não configurado' };
    }

    const valorCents = Math.round(valor * 100);

    const payload = {
      transaction_amount: valorCents,
      description: descricao || 'Pagamento de serviço',
      payment_method_id: cartao.payment_method_id || 'visa',
      token: cartao.token,
      installments: cartao.installments || 1,
      issuer_id: cartao.issuer_id || undefined,
      payer: {
        email: cliente.email || 'cliente@exemplo.com',
        identification: cliente.cpf ? {
          type: 'CPF',
          number: cliente.cpf.replace(/\D/g, '')
        } : undefined
      },
      external_reference: externalReference || `payment_${Date.now()}`,
      statement_descriptor: 'CUIDAFAST'
    };

    // Remove campos undefined
    if (!payload.issuer_id) delete payload.issuer_id;
    if (!payload.payer.identification) delete payload.payer.identification;

    console.log('[MercadoPago] Criando pagamento com cartão:', {
      valor: valorCents,
      descricao
    });

    const response = await axios.post(`${MERCADOPAGO_BASE_URL}/payments`, payload, {
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': externalReference || `card_${Date.now()}`
      }
    });

    return {
      success: true,
      data: {
        id: response.data.id,
        status: response.data.status,
        status_detail: response.data.status_detail,
        external_reference: response.data.external_reference,
        transaction_amount: response.data.transaction_amount,
        date_created: response.data.date_created
      }
    };

  } catch (error) {
    console.error('[MercadoPago] Erro ao criar pagamento com cartão:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Erro ao criar pagamento com cartão',
      details: error.response?.data
    };
  }
}

module.exports = {
  criarPagamentoPIX,
  consultarPagamento,
  criarPagamentoCartao
};

