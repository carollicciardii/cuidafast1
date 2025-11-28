import mercadopago from "mercadopago";
import { criarPreferenciaPagamento } from "../services/mercadoPagoService.js";

// Configuração do Mercado Pago
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

export async function criarPagamento(dados) {
  try {
    const { valor, descricao, idUsuario, usuario } = dados;

    if (!valor || !descricao) {
      return { error: true, message: "Dados incompletos" };
    }

    // Prepara dados do pagador com informações do usuário
    const payerData = {
      id: idUsuario || usuario?.id || null
    };
    
    // Se tiver dados completos do usuário, adiciona informações do pagador
    if (usuario) {
      payerData.name = usuario.nome || null;
      payerData.email = usuario.email || null;
      payerData.phone = usuario.telefone ? {
        area_code: usuario.telefone.replace(/\D/g, '').substring(0, 2) || null,
        number: usuario.telefone.replace(/\D/g, '').substring(2) || null
      } : null;
      
      // Adiciona endereço se disponível
      if (usuario.endereco) {
        payerData.address = {
          zip_code: usuario.endereco.cep?.replace(/\D/g, '') || null,
          street_name: usuario.endereco.rua || null,
          street_number: usuario.endereco.numero ? parseInt(usuario.endereco.numero) : null,
          neighborhood: usuario.endereco.bairro || null,
          city: usuario.endereco.cidade || null,
          federal_unit: usuario.endereco.estado || null
        };
      }
    }

    const result = await criarPreferenciaPagamento({
      valor,
      descricao,
      usuario_id: idUsuario,
      payer: payerData
    });

    return result;

  } catch (err) {
    console.error("Erro no criarPagamento:", err);
    return { error: true, message: "Erro interno ao criar pagamento" };
  }
}
