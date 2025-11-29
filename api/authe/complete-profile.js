import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import UsuarioModel from '../../back-end/api/models/UsuarioModel.js';
import ClienteModel from '../../back-end/api/models/ClienteModel.js';
import CuidadorModel from '../../back-end/api/models/CuidadorModel.js';

dotenv.config();

// ENV vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    let auth_uid = null;
    let nomeFromAuth = null;
    let emailFromAuth = null;

    // Se houver token, pega ID do Google, nome e email
    if (token) {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (userErr || !userData?.user) {
        console.warn('getUser error:', userErr, userData);
        return res.status(401).json({ error: 'Token inválido' });
      }
      const saUser = userData.user;
      auth_uid = saUser.id;

      nomeFromAuth =
        saUser.user_metadata?.full_name ||
        saUser.user_metadata?.name ||
        saUser.user_metadata?.given_name ||
        (saUser.email ? saUser.email.split('@')[0] : null);

      emailFromAuth = saUser.email || null;
    }

    // Extrai dados do body
    let { 
      usuario_id, 
      nome: nomeDoPayload, 
      email: emailDoPayload, 
      photo_url, 
      tipo,
      // Dados comuns
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
      // Dados específicos do cuidador
      tipos_cuidado,
      descricao,
      valor_hora,
      especialidades,
      experiencia,
      horarios_disponiveis,
      idiomas,
      formacao,
      local_trabalho,
      // Dados específicos do cliente (se houver)
      historico_contratacoes,
      preferencias,
      endereco,
      ...restBody 
    } = req.body || {};

    // Detecta tipo de usuário
    // 1. Pelo campo tipo explícito (prioridade máxima)
    // 2. Pela presença de dados específicos do cuidador
    // 3. Pelo tipo do usuário existente no banco
    let userType = tipo;
    
    console.log('[complete-profile] Tipo recebido no payload:', tipo);
    console.log('[complete-profile] usuario_id recebido:', usuario_id);
    
    // Se não tiver tipo explícito, tenta detectar pelos dados
    if (!userType) {
      if (tipos_cuidado || descricao || valor_hora || especialidades || experiencia || 
          horarios_disponiveis || idiomas || formacao || local_trabalho) {
        userType = 'cuidador';
        console.log('[complete-profile] Tipo detectado como cuidador pelos dados específicos');
      }
    }

    // Se ainda não tiver tipo e tiver usuario_id, busca no banco
    if (!userType && usuario_id) {
      try {
        const numericUsuarioId = Number(usuario_id);
        if (Number.isInteger(numericUsuarioId)) {
          const usuarioExistente = await UsuarioModel.getById(numericUsuarioId);
          if (usuarioExistente && usuarioExistente.tipo) {
            userType = usuarioExistente.tipo;
            console.log('[complete-profile] Tipo obtido do banco:', userType);
          }
        }
      } catch (err) {
        console.warn('[complete-profile] Erro ao buscar tipo do usuário:', err);
      }
    }

    // Se ainda não tiver tipo, assume cliente (padrão)
    if (!userType) {
      userType = 'cliente';
      console.log('[complete-profile] Tipo padrão (cliente) aplicado');
    }
    
    console.log('[complete-profile] Tipo final determinado:', userType);

    // Prepara dados para atualização do usuário
    const allowedColumns = new Set([
      'nome','email','telefone','data_cadastro','ultimo_login',
      'data_nascimento','rg_numero','rg_orgao_emissor','rg_data_emissao',
      'cpf_numero','rg_status_validacao','cpf_status_validacao',
      'tipo','photo_url','cpf',
      'cep','numero','rua','bairro','cidade','estado','complemento'
    ]);

    const upsertPayload = {};
    
    // Processa campos permitidos do restBody
    for (const [k, v] of Object.entries(restBody)) {
      if (v === undefined || v === null) continue;
      if (!allowedColumns.has(k)) continue;
      upsertPayload[k] = v;
    }

    // Nome
    const nomeToUse = nomeDoPayload ?? nomeFromAuth ?? 'Usuário';
    upsertPayload.nome = nomeToUse;

    // Photo
    if (photo_url) upsertPayload.photo_url = photo_url;

    // Email: primeiro do Google, se não tiver, do payload
    if (emailFromAuth) {
      upsertPayload.email = emailFromAuth;
    } else if (emailDoPayload && emailDoPayload.trim() !== '') {
      upsertPayload.email = emailDoPayload.trim();
    } else if (!usuario_id) {
      // Email só é obrigatório se não tiver usuario_id
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Tipo
    upsertPayload.tipo = userType;

    // CPF
    const cpfValue = cpf || cpf_numero;
    if (cpfValue) {
      const cpfLimpo = typeof cpfValue === 'string' ? cpfValue.replace(/\D/g, '') : cpfValue;
      upsertPayload.cpf = cpfLimpo;
      upsertPayload.cpf_numero = cpfLimpo;
    }

    // Data de nascimento
    if (data_nascimento) {
      upsertPayload.data_nascimento = data_nascimento;
    }

    // Telefone
    if (telefone) {
      upsertPayload.telefone = telefone;
    }

    // Endereço
    if (cep) upsertPayload.cep = cep;
    if (numero) upsertPayload.numero = numero;
    if (rua) upsertPayload.rua = rua;
    if (bairro) upsertPayload.bairro = bairro;
    if (cidade) upsertPayload.cidade = cidade;
    if (estado) upsertPayload.estado = estado;
    if (complemento) upsertPayload.complemento = complemento;

    // auth_uid separado do usuario_id (INTEGER)
    if (auth_uid) {
      upsertPayload.auth_uid = auth_uid;
    }

    // usuario_id INTEGER (PK interna)
    let numericUsuarioId = null;
    if (usuario_id !== undefined && usuario_id !== null && usuario_id !== '') {
      numericUsuarioId = Number(usuario_id);
      if (!Number.isInteger(numericUsuarioId)) {
        return res.status(400).json({ error: 'usuario_id inválido' });
      }
      upsertPayload.usuario_id = numericUsuarioId;
    }

    // FLUXO 1: Se tiver usuario_id, usa Models (cadastro tradicional)
    if (numericUsuarioId) {
      // Verifica se o usuário existe
      let usuario;
      try {
        usuario = await UsuarioModel.getById(numericUsuarioId);
      } catch (err) {
        console.error('Erro ao buscar usuário:', err);
        return res.status(500).json({ error: 'Erro ao buscar usuário no banco de dados' });
      }
      
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      // Se o usuário já tem tipo definido e não foi passado no payload, usa o tipo existente
      if (!userType && usuario.tipo) {
        userType = usuario.tipo;
      }

      // Atualiza dados do usuário usando Model
      const updateUsuario = {
        tipo: userType
      };
      
      // Adiciona campos permitidos do upsertPayload
      if (upsertPayload.nome) updateUsuario.nome = upsertPayload.nome;
      if (upsertPayload.telefone !== undefined) updateUsuario.telefone = upsertPayload.telefone;
      if (upsertPayload.data_nascimento) updateUsuario.data_nascimento = upsertPayload.data_nascimento;
      if (upsertPayload.photo_url) updateUsuario.photo_url = upsertPayload.photo_url;
      if (upsertPayload.cpf) updateUsuario.cpf = upsertPayload.cpf;
      if (upsertPayload.cpf_numero) updateUsuario.cpf_numero = upsertPayload.cpf_numero;
      if (upsertPayload.cep) updateUsuario.cep = upsertPayload.cep;
      if (upsertPayload.numero) updateUsuario.numero = upsertPayload.numero;
      if (upsertPayload.rua) updateUsuario.rua = upsertPayload.rua;
      if (upsertPayload.bairro) updateUsuario.bairro = upsertPayload.bairro;
      if (upsertPayload.cidade) updateUsuario.cidade = upsertPayload.cidade;
      if (upsertPayload.estado) updateUsuario.estado = upsertPayload.estado;
      if (upsertPayload.complemento) updateUsuario.complemento = upsertPayload.complemento;
      
      if (Object.keys(updateUsuario).length > 0) {
        await UsuarioModel.update(numericUsuarioId, updateUsuario);
      }

      // Atualiza auth_uid separadamente se necessário
      if (auth_uid) {
        await UsuarioModel.updateGoogleData(numericUsuarioId, auth_uid, photo_url);
      }

      // Atualiza tabela específica conforme tipo
      if (userType === 'cuidador') {
        try {
          const cuidadorData = {};
          if (tipos_cuidado !== undefined && tipos_cuidado !== null) cuidadorData.tipos_cuidado = tipos_cuidado;
          if (descricao !== undefined && descricao !== null) cuidadorData.descricao = descricao;
          if (valor_hora !== undefined && valor_hora !== null) cuidadorData.valor_hora = valor_hora;
          if (especialidades !== undefined && especialidades !== null) cuidadorData.especialidades = especialidades;
          if (experiencia !== undefined && experiencia !== null) cuidadorData.experiencia = experiencia;
          if (horarios_disponiveis !== undefined && horarios_disponiveis !== null) cuidadorData.horarios_disponiveis = horarios_disponiveis;
          if (idiomas !== undefined && idiomas !== null) cuidadorData.idiomas = idiomas;
          if (formacao !== undefined && formacao !== null) cuidadorData.formacao = formacao;
          if (local_trabalho !== undefined && local_trabalho !== null) cuidadorData.local_trabalho = local_trabalho;

          const cuidadorExistente = await CuidadorModel.getById(numericUsuarioId);
          
          if (cuidadorExistente) {
            if (Object.keys(cuidadorData).length > 0) {
              await CuidadorModel.update(numericUsuarioId, cuidadorData);
            }
          } else {
            await CuidadorModel.create({
              usuario_id: numericUsuarioId,
              ...cuidadorData
            });
          }
        } catch (err) {
          console.error('Erro ao atualizar/criar cuidador:', err);
          // Não retorna erro aqui, apenas loga, pois o usuário já foi atualizado
        }
      } else if (userType === 'cliente') {
        try {
          // Atualiza dados do cliente se necessário
          const clienteData = {};
          if (historico_contratacoes !== undefined && historico_contratacoes !== null) clienteData.historico_contratacoes = historico_contratacoes;
          if (preferencias !== undefined && preferencias !== null) clienteData.preferencias = preferencias;
          if (endereco !== undefined && endereco !== null) clienteData.endereco = endereco;

          const clienteExistente = await ClienteModel.getById(numericUsuarioId);
          
          if (clienteExistente) {
            if (Object.keys(clienteData).length > 0) {
              await ClienteModel.update(numericUsuarioId, clienteData);
            }
          } else {
            await ClienteModel.create({
              usuario_id: numericUsuarioId,
              ...clienteData
            });
          }
        } catch (err) {
          console.error('Erro ao atualizar/criar cliente:', err);
          // Não retorna erro aqui, apenas loga, pois o usuário já foi atualizado
        }
      }

      // Retorna dados atualizados
      let usuarioAtualizado;
      try {
        usuarioAtualizado = await UsuarioModel.getById(numericUsuarioId);
        if (!usuarioAtualizado) {
          return res.status(404).json({ error: 'Usuário não encontrado após atualização' });
        }
        delete usuarioAtualizado.senha;
      } catch (err) {
        console.error('Erro ao buscar usuário atualizado:', err);
        return res.status(500).json({ error: 'Erro ao buscar dados atualizados do usuário' });
      }

      const responseData = {
        message: `Dados do ${userType} atualizados com sucesso`,
        user: usuarioAtualizado
      };

      try {
        if (userType === 'cuidador') {
          const cuidadorAtualizado = await CuidadorModel.getById(numericUsuarioId);
          responseData.cuidador = cuidadorAtualizado;
        } else if (userType === 'cliente') {
          const clienteAtualizado = await ClienteModel.getById(numericUsuarioId);
          responseData.cliente = clienteAtualizado;
        }
      } catch (err) {
        console.warn('Erro ao buscar dados específicos do tipo:', err);
        // Não falha a requisição, apenas não retorna os dados específicos
      }

      return res.status(200).json(responseData);
    }

    // FLUXO 2: Se não tiver usuario_id, usa Supabase upsert (OAuth/Google)
    // Upsert: prioridade de conflito -> auth_uid (quando existir) ou email (único)
    const upsertKey = auth_uid ? 'auth_uid' : 'email';

    const { data, error } = await supabaseAdmin
      .from('usuario')
      .upsert(upsertPayload, { onConflict: upsertKey })
      .select();

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: 'Erro ao gravar usuário', details: error });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado para upsert' });
    }

    const usuarioCriado = data[0];
    const usuarioIdFinal = usuarioCriado.usuario_id;

    // Cria/atualiza registros nas tabelas específicas
    if (userType === 'cuidador') {
      const cuidadorData = {};
      if (tipos_cuidado !== undefined) cuidadorData.tipos_cuidado = tipos_cuidado;
      if (descricao !== undefined) cuidadorData.descricao = descricao;
      if (valor_hora !== undefined) cuidadorData.valor_hora = valor_hora;
      if (especialidades !== undefined) cuidadorData.especialidades = especialidades;
      if (experiencia !== undefined) cuidadorData.experiencia = experiencia;
      if (horarios_disponiveis !== undefined) cuidadorData.horarios_disponiveis = horarios_disponiveis;
      if (idiomas !== undefined) cuidadorData.idiomas = idiomas;
      if (formacao !== undefined) cuidadorData.formacao = formacao;
      if (local_trabalho !== undefined) cuidadorData.local_trabalho = local_trabalho;

      try {
        const cuidadorExistente = await CuidadorModel.getById(usuarioIdFinal);
        if (cuidadorExistente) {
          if (Object.keys(cuidadorData).length > 0) {
            await CuidadorModel.update(usuarioIdFinal, cuidadorData);
          }
        } else {
          await CuidadorModel.create({
            usuario_id: usuarioIdFinal,
            ...cuidadorData
          });
        }
      } catch (err) {
        console.warn('Erro ao atualizar cuidador:', err);
      }
    } else if (userType === 'cliente') {
      try {
        const clienteExistente = await ClienteModel.getById(usuarioIdFinal);
        if (!clienteExistente) {
          await ClienteModel.create({
            usuario_id: usuarioIdFinal
          });
        }
      } catch (err) {
        console.warn('Erro ao atualizar cliente:', err);
      }
    }

    return res.status(200).json({ user: usuarioCriado });

  } catch (err) {
    console.error('complete-profile unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
