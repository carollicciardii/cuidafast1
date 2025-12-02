// api/auth/complete-profile.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import UsuarioModel from '../../back-end/api/models/UsuarioModel.js';
import ClienteModel from '../../back-end/api/models/ClienteModel.js';
import CuidadorModel from '../../back-end/api/models/CuidadorModel.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function looksLikeUUID(v) {
  return typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    let auth_uid = null;
    let nomeFromAuth = null;
    let emailFromAuth = null;

    if (token) {
      try {
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (!userData?.user || userErr) return res.status(401).json({ error: 'Token inválido' });
        const saUser = userData.user;
        auth_uid = saUser.id;
        nomeFromAuth = saUser.user_metadata?.full_name || saUser.user_metadata?.name || saUser.user_metadata?.given_name || (saUser.email ? saUser.email.split('@')[0] : null);
        emailFromAuth = saUser.email || null;
      } catch (err) {
        return res.status(500).json({ error: 'Erro ao validar token', message: err.message });
      }
    }

    const {
      usuario_id,
      nome: nomeDoPayload,
      email: emailDoPayload,
      photo_url,
      tipo,
      cpf,
      cpf_numero,
      data_nascimento,
      telefone,
      cep,
      numero,
      rua,
      bairro,
      cidade,
      estado,
      complemento,
      // cuidador
      tipos_cuidado,
      descricao,
      valor_hora,
      especialidades,
      experiencia,
      horarios_disponiveis,
      idiomas,
      formacao,
      local_trabalho,
      // cliente
      historico_contratacoes,
      preferencias,
      endereco,
      ...restBody
    } = req.body || {};

    let userType = tipo;
    if (!userType) {
      if (tipos_cuidado || descricao || valor_hora || especialidades || experiencia) userType = 'cuidador';
      else userType = 'cliente';
    }

    let usuarioIdNum = undefined;
    if (usuario_id) {
      if (looksLikeUUID(usuario_id)) auth_uid = usuario_id;
      else {
        const num = Number(usuario_id);
        if (Number.isInteger(num)) usuarioIdNum = num;
      }
    }

    const emailFinal = emailFromAuth || emailDoPayload || null;

    const upsertPayload = {
      tipo: userType,
      nome: nomeDoPayload || nomeFromAuth || 'Usuário',
      email: emailFinal,
      telefone,
      data_nascimento,
      photo_url,
      cpf: cpf || cpf_numero,
      cep,
      numero,
      rua,
      bairro,
      cidade,
      estado,
      complemento,
      auth_uid,
      usuario_id: usuarioIdNum,
      ...restBody
    };

    if (!upsertPayload.email && !auth_uid) return res.status(400).json({ error: 'Email é obrigatório' });

    // Fluxo 1: usuario_id numérico → Models
    if (usuarioIdNum) {
      const usuarioExistente = await UsuarioModel.getById(usuarioIdNum);
      if (!usuarioExistente) return res.status(404).json({ error: 'Usuário não encontrado' });

      await UsuarioModel.update(usuarioIdNum, upsertPayload);

      if (userType === 'cuidador') {
        const cuidadorData = { tipos_cuidado, descricao, valor_hora, especialidades, experiencia, horarios_disponiveis, idiomas, formacao, local_trabalho };
        const existente = await CuidadorModel.getById(usuarioIdNum);
        if (existente) await CuidadorModel.update(usuarioIdNum, cuidadorData);
        else await CuidadorModel.create({ usuario_id: usuarioIdNum, ...cuidadorData });
      } else {
        const clienteData = { historico_contratacoes, preferencias, endereco };
        const existente = await ClienteModel.getById(usuarioIdNum);
        if (existente) await ClienteModel.update(usuarioIdNum, clienteData);
        else await ClienteModel.create({ usuario_id: usuarioIdNum, ...clienteData });
      }

      const userAtualizado = await UsuarioModel.getById(usuarioIdNum);
      delete userAtualizado.senha;
      return res.status(200).json({ message: 'Usuário atualizado com sucesso', user: userAtualizado });
    }

    // Fluxo 2: OAuth/UUID → Supabase upsert
    const key = auth_uid ? 'auth_uid' : 'email';
    const { data, error } = await supabaseAdmin
      .from('usuario')
      .upsert(upsertPayload, { onConflict: key })
      .select();

    if (error) return res.status(500).json({ error: 'Erro ao gravar usuário', details: error.message });

    const createdUser = data[0];
    if (!createdUser) return res.status(500).json({ error: 'Usuário não criado/upsertado' });

    const usuarioIdFinal = createdUser.usuario_id;

    if (userType === 'cuidador') {
      const cuidadorData = { tipos_cuidado, descricao, valor_hora, especialidades, experiencia, horarios_disponiveis, idiomas, formacao, local_trabalho };
      const existente = await CuidadorModel.getById(usuarioIdFinal);
      if (existente) await CuidadorModel.update(usuarioIdFinal, cuidadorData);
      else await CuidadorModel.create({ usuario_id: usuarioIdFinal, ...cuidadorData });
    } else {
      const clienteData = { historico_contratacoes, preferencias, endereco };
      const existente = await ClienteModel.getById(usuarioIdFinal);
      if (existente) await ClienteModel.update(usuarioIdFinal, clienteData);
      else await ClienteModel.create({ usuario_id: usuarioIdFinal, ...clienteData });
    }

    return res.status(200).json({ message: 'Usuário atualizado/criado com sucesso', user: createdUser });
  } catch (err) {
    console.error('complete-profile error:', err);
    return res.status(500).json({ error: 'Erro interno', message: err.message });
  }
}
