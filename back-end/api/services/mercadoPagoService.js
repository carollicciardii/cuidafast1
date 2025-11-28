import mercadopago from "mercadopago";

export async function criarPreferenciaPagamento({ valor, descricao, usuario_id, payer }) {
  try {
    const preferenceData = {
      items: [
        {
          title: descricao,
          quantity: 1,
          unit_price: Number(valor),
          currency_id: "BRL"
        }
      ],

      back_urls: {
        success: process.env.MP_SUCCESS_URL,
        failure: process.env.MP_FAIL_URL,
        pending: process.env.MP_PENDING_URL
      },

      auto_return: "approved"
    };

    // Adiciona dados do pagador se disponíveis
    if (payer) {
      preferenceData.payer = {};
      if (payer.id) preferenceData.payer.id = payer.id;
      if (payer.name) preferenceData.payer.name = payer.name;
      if (payer.email) preferenceData.payer.email = payer.email;
      if (payer.phone) preferenceData.payer.phone = payer.phone;
      if (payer.address) preferenceData.payer.address = payer.address;
    } else if (usuario_id) {
      preferenceData.payer = {
        id: usuario_id
      };
    }

    const preference = await mercadopago.preferences.create(preferenceData);

    return {
      success: true,
      preference_id: preference.body.id,
      init_point: preference.body.init_point
    };

  } catch (error) {
    console.error("Erro ao criar preferência:", error);
    return { error: true, message: "Erro ao criar preferência" };
  }
}
