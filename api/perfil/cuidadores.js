// api/perfil/cuidadores.js
// Handler único de perfis (cuidadores, cuidador, cliente, buscar, foto)

import UsuarioModel from '../../back-end/api/models/UsuarioModel.js';
import CuidadorModel from '../../back-end/api/models/CuidadorModel.js';
import ClienteModel from '../../back-end/api/models/ClienteModel.js';

async function listarCuidadoresHandler(urlObj, res) {
  const especialidade = urlObj.searchParams.get('especialidade');
  const cidade = urlObj.searchParams.get('cidade');
  const valorMax = urlObj.searchParams.get('valorMax');

  const cuidadores = await CuidadorModel.getAll();
  const perfisPublicos = [];

  for (const cuidador of cuidadores) {
    const usuario = await UsuarioModel.getById(cuidador.usuario_id);
    if (!usuario) continue;

    let incluir = true;
    if (especialidade && !(cuidador.especialidades || []).includes(especialidade)) incluir = false;
    if (cidade && !(cuidador.local_trabalho || '').includes(cidade)) incluir = false;
    if (valorMax && cuidador.valor_hora > Number(valorMax)) incluir = false;

    if (incluir) {
      perfisPublicos.push({
        id: usuario.usuario_id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        foto_perfil: usuario.photo_url || usuario.foto_perfil || null,
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
      });
    }
  }

  return res.status(200).json({ cuidadores: perfisPublicos, total: perfisPublicos.length });
}

async function perfilCuidadorHandler(urlObj, res) {
  const id = urlObj.searchParams.get('id');
  if (!id) {
    return res.status(400).json({ message: 'Parâmetro id é obrigatório' });
  }

  // Tentar buscar por ID primeiro, depois por email se falhar
  let usuario = await UsuarioModel.getById(id);
  if (!usuario && id.includes('@')) {
    // Se o ID parece ser um email, tentar buscar por email
    usuario = await UsuarioModel.findByEmail(id);
  }
  
  if (!usuario) {
    return res.status(404).json({ message: 'Cuidador não encontrado' });
  }

  // Buscar perfil de cuidador usando o usuario_id
  const cuidador = await CuidadorModel.getById(usuario.usuario_id);
  if (!cuidador) {
    return res.status(404).json({ message: 'Perfil de cuidador não encontrado' });
  }

  const perfilPublico = {
    id: usuario.usuario_id,
    usuario_id: usuario.usuario_id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
    foto_perfil: usuario.photo_url || usuario.foto_perfil || null,
    data_cadastro: usuario.data_cadastro,
    tipos_cuidado: cuidador.tipos_cuidado,
    descricao: cuidador.descricao,
    valor_hora: cuidador.valor_hora,
    especialidades: cuidador.especialidades,
    experiencia: cuidador.experiencia,
    avaliacao: cuidador.avaliacao || 0,
    num_avaliacoes: cuidador.num_avaliacoes || 0,
    horarios_disponiveis: cuidador.horarios_disponiveis,
    idiomas: cuidador.idiomas,
    formacao: cuidador.formacao,
    local_trabalho: cuidador.local_trabalho,
  };

  return res.status(200).json(perfilPublico);
}

async function perfilClienteHandler(urlObj, res) {
  const id = urlObj.searchParams.get('id');
  if (!id) {
    return res.status(400).json({ message: 'Parâmetro id é obrigatório' });
  }

  const usuario = await UsuarioModel.getById(id);
  if (!usuario) {
    return res.status(404).json({ message: 'Cliente não encontrado' });
  }

  const cliente = await ClienteModel.getById(id);
  if (!cliente) {
    return res.status(404).json({ message: 'Perfil de cliente não encontrado' });
  }

  const perfilPublico = {
    id: usuario.usuario_id,
    nome: usuario.nome,
    foto_perfil: usuario.photo_url || usuario.foto_perfil || null,
    data_cadastro: usuario.data_cadastro,
    endereco: cliente.endereco,
    preferencias: cliente.preferencias,
  };

  return res.status(200).json(perfilPublico);
}

async function buscarPerfilHandler(urlObj, res) {
  const email = urlObj.searchParams.get('email');
  const tipo = urlObj.searchParams.get('tipo');

  if (!email || !tipo) {
    return res.status(400).json({ message: 'Email e tipo são obrigatórios' });
  }

  const usuario = await UsuarioModel.findByEmail(email);
  if (!usuario) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }

  if (tipo === 'cuidador') {
    const cuidador = await CuidadorModel.getById(usuario.usuario_id);
    if (!cuidador) {
      return res.status(404).json({ message: 'Perfil de cuidador não encontrado' });
    }

    return res.status(200).json({
      id: usuario.usuario_id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      foto_perfil: usuario.photo_url || usuario.foto_perfil || null,
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

  if (tipo === 'cliente') {
    const cliente = await ClienteModel.getById(usuario.usuario_id);
    if (!cliente) {
      return res.status(404).json({ message: 'Perfil de cliente não encontrado' });
    }

    return res.status(200).json({
      id: usuario.usuario_id,
      nome: usuario.nome,
      foto_perfil: usuario.photo_url || usuario.foto_perfil || null,
      endereco: cliente.endereco,
      preferencias: cliente.preferencias,
    });
  }

  return res.status(400).json({ message: 'Tipo inválido. Use "cuidador" ou "cliente"' });
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let data = '';
    req.on?.('data', (chunk) => (data += chunk));
    req.on?.('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on?.('error', reject);
  });
}

async function atualizarFotoHandler(req, res) {
  const body = await parseJsonBody(req);
  const { userId, fotoUrl } = body;

  if (!userId || !fotoUrl) {
    return res.status(400).json({ message: 'userId e fotoUrl são obrigatórios' });
  }

  await UsuarioModel.update(userId, { photo_url: fotoUrl });

  return res.status(200).json({ message: 'Foto atualizada com sucesso', fotoUrl });
}

export default async function handler(req, res) {
  try {
    const { url, method } = req;
    const urlObj = new URL(url, 'http://localhost');
    const action = urlObj.searchParams.get('action') || 'cuidadores';

    // Rotas GET
    if (method === 'GET') {
      if (action === 'cuidadores') {
        return await listarCuidadoresHandler(urlObj, res);
      }
      if (action === 'cuidador') {
        return await perfilCuidadorHandler(urlObj, res);
      }
      if (action === 'cliente') {
        return await perfilClienteHandler(urlObj, res);
      }
      if (action === 'buscar') {
        return await buscarPerfilHandler(urlObj, res);
      }
    }

    // Atualizar foto
    if (method === 'PUT' && action === 'foto') {
      return await atualizarFotoHandler(req, res);
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ message: 'Método ou ação não suportados' });
  } catch (err) {
    console.error('[api/perfil/cuidadores] Erro:', err);
    return res.status(500).json({ message: 'Erro interno', error: String(err) });
  }
}
