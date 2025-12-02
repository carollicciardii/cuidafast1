// services/mercadopago.service.js
import axios from "axios";

const MERCADOPAGO_BASE_URL = process.env.MERCADOPAGO_BASE_URL || "https://api.mercadopago.com";
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!MERCADOPAGO_ACCESS_TOKEN) {
  console.warn("⚠️ MERCADOPAGO_ACCESS_TOKEN não configurado nas variáveis de ambiente");
}

function safePhoneParts(phoneRaw) {
  if (!phoneRaw) return undefined;
  const digits = String(phoneRaw).replace(/\D/g, "");
  return {
    area_code: digits.slice(0, 2) || undefined,
    number: digits.slice(2) || undefined
  };
}

export async function criarPagamentoPIX(valor, descricao, cliente = {}, externalReference = null) {
  try {
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      return { success: false, error: "Token do Mercado Pago não configurado" };
    }

    const transaction_amount = Number(valor);
    if (!transaction_amount || isNaN(transaction_amount) || transaction_amount <= 0) {
      return { success: false, error: "Valor inválido" };
    }

    const names = (cliente.nome || "").trim().split(/\s+/);
    const payer = {
      email: cliente.email || "cliente@exemplo.com",
      first_name: names[0] || "Cliente",
      last_name: names.slice(1).join(" ") || undefined,
      identification: cliente.cpf
        ? { type: "CPF", number: String(cliente.cpf).replace(/\D/g, "") }
        : undefined,
      phone: cliente.telefone ? safePhoneParts(cliente.telefone) : undefined,
      address: cliente.endereco ? cliente.endereco : undefined
    };

    const payload = {
      transaction_amount,
      description: descricao || "Pagamento de serviço",
      payment_method_id: "pix",
      payer,
      external_reference: externalReference || `payment_${Date.now()}`,
      statement_descriptor: "CUIDAFAST",
      notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || undefined
    };

    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    console.log("[MercadoPago] Criando pagamento PIX", {
      transaction_amount,
      external_reference: payload.external_reference,
      payer_email: payer.email
    });

    const response = await axios.post(`${MERCADOPAGO_BASE_URL}/payments`, payload, {
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": externalReference || `pix_${Date.now()}`
      },
      timeout: 15000
    });

    const d = response.data;
    console.log("[MercadoPago] criado pagamento id=", d.id, "status=", d.status);

    return {
      success: true,
      data: {
        id: d.id,
        status: d.status,
        qr_code: d.point_of_interaction?.transaction_data?.qr_code || null,
        qr_code_base64: d.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        ticket_url: d.point_of_interaction?.transaction_data?.ticket_url || null,
        external_reference: d.external_reference,
        transaction_amount: d.transaction_amount,
        date_created: d.date_created,
        date_of_expiration: d.date_of_expiration
      }
    };
  } catch (error) {
    console.error("[MercadoPago] Erro ao criar pagamento PIX:", error.response?.status, error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message, details: error.response?.data };
  }
}

export async function consultarPagamento(paymentId) {
  try {
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      return { success: false, error: "Token do Mercado Pago não configurado" };
    }

    const response = await axios.get(`${MERCADOPAGO_BASE_URL}/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      timeout: 10000
    });

    const d = response.data;
    return {
      success: true,
      data: {
        id: d.id,
        status: d.status,
        status_detail: d.status_detail,
        transaction_amount: d.transaction_amount,
        date_created: d.date_created,
        date_approved: d.date_approved,
        external_reference: d.external_reference
      }
    };
  } catch (error) {
    console.error("[MercadoPago] Erro ao consultar pagamento:", error.response?.status, error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message, details: error.response?.data };
  }
}

export default {
  criarPagamentoPIX,
  consultarPagamento
};
