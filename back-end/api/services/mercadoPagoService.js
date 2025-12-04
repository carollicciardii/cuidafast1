// services/mercadopago.service.js
import axios from "axios";

const MERCADOPAGO_BASE_URL = process.env.MERCADOPAGO_BASE_URL || "https://api.mercadopago.com";
// aceita também a variável MP_ACCESS_TOKEN por compatibilidade
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

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
      email: cliente.email || "TESTUSER4604601283137415595@testuser.com",
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

    // remove campos undefined
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    // DEBUG LOG: não imprime o token inteiro, só prefixo
    try {
      console.log("[MercadoPago] POST", `${MERCADOPAGO_BASE_URL}/v1/payments`);
      console.log("[MercadoPago] AUTH (masked):", (MERCADOPAGO_ACCESS_TOKEN || "").slice(0, 6) + "...");
      console.log("[MercadoPago] payload:", JSON.stringify(payload));
    } catch (e) {
      /* ignore logging errors */
    }

    const idempotencyKey = externalReference || `pix_${Date.now()}`;

    const response = await axios.post(`${MERCADOPAGO_BASE_URL}/v1/payments`, payload, {
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      },
      timeout: 15000
    });

    const d = response.data;
    console.log("[MercadoPago] criado pagamento id=", d?.id, "status=", d?.status);

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
        date_of_expiration: d.date_of_expiration,
        raw: d
      }
    };
  } catch (error) {
    // tenta extrair info útil
    const status = error?.response?.status;
    const respData = error?.response?.data;
    console.error("[MercadoPago] Erro ao criar pagamento PIX:", status, respData || error.message);

    // retorna detalhes para o caller debugar (não vaza token)
    return {
      success: false,
      error: (respData && (respData.message || respData.error || JSON.stringify(respData))) || error.message,
      details: respData || null,
      status: status || null
    };
  }
}

export async function consultarPagamento(paymentId) {
  try {
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      return { success: false, error: "Token do Mercado Pago não configurado" };
    }

    // DEBUG
    try {
      console.log("[MercadoPago] GET", `${MERCADOPAGO_BASE_URL}/v1/payments/${paymentId}`);
      console.log("[MercadoPago] AUTH (masked):", (MERCADOPAGO_ACCESS_TOKEN || "").slice(0, 6) + "...");
    } catch (e) {}

    const response = await axios.get(`${MERCADOPAGO_BASE_URL}/v1/payments/${paymentId}`, {
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
        external_reference: d.external_reference,
        raw: d
      }
    };
  } catch (error) {
    const status = error?.response?.status;
    const respData = error?.response?.data;
    console.error("[MercadoPago] Erro ao consultar pagamento:", status, respData || error.message);
    return { success: false, error: (respData && (respData.message || respData.error || JSON.stringify(respData))) || error.message, details: respData || null, status: status || null };
  }
}

export default {
  criarPagamentoPIX,
  consultarPagamento
};
