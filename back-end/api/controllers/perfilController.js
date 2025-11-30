import UsuarioModel from "../../back-end/models/UsuarioModel";
import CuidadorModel from "../../back-end/models/CuidadorModel";
import ClienteModel from "../../back-end/models/ClienteModel";

export default async function handler(req, res) {
  const { method } = req;

  try {
    // ======================= GET /api/perfil/cuidador?id=XXX =======================
    if (method === "GET" && req.query.action === "cuidador") {
      const { id } = req.query;

      const usuario = await UsuarioModel.getById(id);
      if (!usuario) return res.status(404).json({ message: "Cuidador não encontrado" });

      const cuidador = await CuidadorModel.getById(id);
      if (!cuidador) return res.status(404).json({ message: "Perfil de cuidador não encontrado" });

      const perfilPublico = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        foto_perfil: usuario.foto_perfil,
        data_cadastro: usuario.data_cadastro,
        tipos_cuidado: cuidador.tipos_cuidado,
        descricao: cuidador.descricao,
        valor_hora: cuidador.valor_hora,
        especialidades: cuidador.especialidades,
        experiencia: cuidador.experiencia,
        avaliacao: cuidador.avaliacao,
        horarios_disponiveis: cuidador.horarios_disponiveis,
        idiomas: cuidador.idiomas,
        formacao: cuidador.formacao,
        local_trabalho: cuidador.local_trabalho,
      };

      return res.status(200).json(perfilPublico);
    }

    // ===================== GET /api/perfil/cliente?id=XXX ==========================
    if (method === "GET" && req.query.action === "cliente") {
      const { id } = req.query;

      const usuario = await UsuarioModel.getById(id);
      if (!usuario) return res.status(404).json({ message: "Cliente não encontrado" });

      const cliente = await ClienteModel.getById(id);
      if (!cliente) return res.status(404).json({ message: "Perfil de cliente não encontrado" });

      const perfilPublico = {
        id: usuario.id,
        nome: usuario.nome,
        foto_perfil: usuario.foto_perfil,
        data_cadastro: usuario.data_cadastro,
        endereco: cliente.endereco,
        preferencias: cliente.preferencias,
      };

      return res.status(200).json(perfilPublico);
    }

    // =================== GET /api/perfil/buscar?email=xxx&tipo=cuidador =============
    if (method === "GET" && req.query.action === "buscar") {
      const { email, tipo } = req.query;

      if (!email || !tipo) return res.status(400).json({ message: "Email e tipo são obrigatórios" });

      const usuario = await UsuarioModel.findByEmail(email);
      if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });

      if (tipo === "cuidador") {
        const cuidador = await CuidadorModel.getById(usuario.id);
        if (!cuidador) return res.status(404).json({ message: "Perfil de cuidador não encontrado" });

        return res.status(200).json({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          foto_perfil: usuario.foto_perfil,
          tipos_cuidado: cuidador.tipos_cuidado,
          descricao: cuidador.descricao,
          valor_hora: cuidador.valor_hora,
          especialidades: cuidador.especialidades,
          experiencia: cuidador.experiencia,
          avaliacao: cuidador.avaliacao,
          horarios_disponiveis: cuidador.horarios_disponiveis,
          idiomas: cuidador.idiomas,
          formacao: cuidador.formacao,
          local_trabalho: cuidador.local_trabalho,
        });
      }

      if (tipo === "cliente") {
        const cliente = await ClienteModel.getById(usuario.id);
        if (!cliente) return res.status(404).json({ message: "Perfil de cliente não encontrado" });

        return res.status(200).json({
          id: usuario.id,
          nome: usuario.nome,
          foto_perfil: usuario.foto_perfil,
          endereco: cliente.endereco,
          preferencias: cliente.preferencias,
        });
      }

      return res.status(400).json({ message: 'Tipo inválido. Use "cuidador" ou "cliente"' });
    }

    // ===================== GET /api/perfil/cuidadores ===============================
    if (method === "GET" && req.query.action === "cuidadores") {
      const { especialidade, cidade, valorMax } = req.query;

      const cuidadores = await CuidadorModel.getAll();
      const perfisPublicos = [];

      for (const cuidador of cuidadores) {
        const usuario = await UsuarioModel.getById(cuidador.usuario_id);
        if (!usuario) continue;

        let incluir = true;
        if (especialidade && !cuidador.especialidades?.includes(especialidade)) incluir = false;
        if (cidade && !cuidador.local_trabalho?.includes(cidade)) incluir = false;
        if (valorMax && cuidador.valor_hora > Number(valorMax)) incluir = false;

        if (incluir) {
          perfisPublicos.push({
            id: usuario.id,
            nome: usuario.nome,
            foto_perfil: usuario.foto_perfil,
            tipos_cuidado: cuidador.tipos_cuidado,
            descricao: cuidador.descricao,
            valor_hora: cuidador.valor_hora,
            especialidades: cuidador.especialidades,
            experiencia: cuidador.experiencia,
            avaliacao: cuidador.avaliacao,
            local_trabalho: cuidador.local_trabalho,
          });
        }
      }

      return res.status(200).json({ cuidadores: perfisPublicos, total: perfisPublicos.length });
    }

    // ===================== PUT /api/perfil/foto ===============================
    if (method === "PUT" && req.query.action === "foto") {
      const { userId, fotoUrl } = req.body;
      if (!userId || !fotoUrl)
        return res.status(400).json({ message: "userId e fotoUrl são obrigatórios" });

      await UsuarioModel.updateFotoPerfil(userId, fotoUrl);

      return res.status(200).json({ message: "Foto atualizada com sucesso", fotoUrl });
    }

    return res.status(405).json({ message: "Método ou rota não suportada" });

  } catch (err) {
    console.error("[Perfil API] Erro:", err);
    return res.status(500).json({ message: "Erro no servidor" });
  }
}
