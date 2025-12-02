import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

import UsuarioModel from '../models/UsuarioModel.js';
import TokenModel from '../models/TokenModel.js';
import ClienteModel from '../models/ClienteModel.js';
import CuidadorModel from '../models/CuidadorModel.js';

/* ------------------------------------------
    CONFIG
-------------------------------------------*/
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '30d';
const BCRYPT_ROUNDS = 10;

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true' || false;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* ------------------------------------------
    SUPABASE CLIENT
-------------------------------------------*/
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

/* ------------------------------------------
    HELPERS
-------------------------------------------*/
function createAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function createRefreshToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function setRefreshCookie(res, token) {
  const cookie = [
    `refreshToken=${token}`,
    `HttpOnly`,
    `Path=/`,
    `SameSite=Lax`
  ];

  if (COOKIE_SECURE) cookie.push('Secure');
  if (COOKIE_DOMAIN) cookie.push(`Domain=${COOKIE_DOMAIN}`);

  res.setHeader('Set-Cookie', cookie.join('; '));
}

function validateRegisterBody(data) {
  const errors = [];

  if (!data.nome || data.nome.length < 2) {
    errors.push({ msg: 'Nome curto', field: 'nome' });
  }

  const emailRegex = /\S+@\S+\.\S+/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push({ msg: 'Email inválido', field: 'email' });
  }

  if (!data.senha || data.senha.length < 6) {
    errors.push({ msg: 'Senha precisa de pelo menos 6 caracteres', field: 'senha' });
  }

  return errors;
}

/* ------------------------------------------
    REGISTER TRADICIONAL
-------------------------------------------*/
export const register = async (req, res) => {
  try {
    const body = req.body || {};
    const { nome, email, senha, telefone, data_nascimento, tipo } = body;

    const errors = validateRegisterBody(body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    if (tipo && !['cliente', 'cuidador'].includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de usuário inválido' });
    }

    const existing = await UsuarioModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email já cadastrado' });
    }

    const hash = await bcrypt.hash(senha, BCRYPT_ROUNDS);

    const userId = await UsuarioModel.create({
      nome,
      email,
      senha: hash,
      telefone: telefone || null,
      data_nascimento: data_nascimento || null,
      tipo: tipo || null,
      photo_url: null,
      auth_uid: null
    });

    if (tipo === 'cliente') {
      await ClienteModel.create({ usuario_id: userId });
    }

    if (tipo === 'cuidador') {
      await CuidadorModel.create({ usuario_id: userId });
    }

    const user = await UsuarioModel.getById(userId);
    delete user.senha;

    // Cria tokens para autenticação automática após cadastro
    const payload = { id: user.usuario_id, email: user.email };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    // Salva refresh token no banco
    await TokenModel.create(user.usuario_id, refreshToken);

    // Define cookie de refresh token
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({ 
      user,
      accessToken,
      message: 'Usuário cadastrado com sucesso'
    });

  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

/* ------------------------------------------
    LOGIN TRADICIONAL
-------------------------------------------*/
export const login = async (req, res) => {
  try {
    const { email, senha } = req.body || {};

    const user = await UsuarioModel.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });

    const match = await bcrypt.compare(senha, user.senha);
    if (!match) return res.status(401).json({ message: 'Credenciais inválidas' });

    const payload = { id: user.usuario_id, email: user.email };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    await TokenModel.create(user.usuario_id, refreshToken);
    await UsuarioModel.setLastLogin(user.usuario_id);

    delete user.senha;

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({ accessToken, user });

  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

/* ------------------------------------------
    GOOGLE LOGIN (NOVO)
-------------------------------------------*/
export const googleLogin = async (req, res) => {
  try {
    // pega com segurança os campos do body e evita ReferenceError
    const {
      auth_uid,
      email,
      nome,
      foto_url,
      tipo_usuario,
      // outros campos que o front possa mandar
      ...rest
    } = req.body || {};

    console.log('googleLogin bodyKeys:', Object.keys(req.body || {}), 'auth_uid present:', !!auth_uid);

    // validações básicas
    if (!email) {
      console.warn('googleLogin: email ausente');
      return res.status(400).json({ message: 'Email obrigatório' });
    }

    if (!supabase) {
      console.error('googleLogin: supabase não configurado');
      return res.status(500).json({ message: 'Supabase não configurado' });
    }

    // verifica se já existe no DB
    let user = await UsuarioModel.findByEmail(email);

    if (!user) {
      // Usuário não existe - cria novo
      const tipo = tipo_usuario === 'cuidador' ? 'cuidador' : 'cliente';

      // cria usuário base (inclui auth_uid se presente)
      const newId = await UsuarioModel.create({
        nome: nome || email.split('@')[0],
        email,
        senha: null,
        telefone: null,
        data_nascimento: null,
        tipo,
        photo_url: foto_url || null,
        auth_uid: auth_uid || null
      });

      user = await UsuarioModel.getById(newId);

      // cria registros complementares conforme tipo (só se não existirem)
      if (tipo === 'cliente') {
        const clienteExistente = await ClienteModel.getById(newId);
        if (!clienteExistente) {
          await ClienteModel.create({ usuario_id: newId });
        }
      } else if (tipo === 'cuidador') {
        const cuidadorExistente = await CuidadorModel.getById(newId);
        if (!cuidadorExistente) {
          await CuidadorModel.create({ usuario_id: newId });
        }
      }

      console.info('googleLogin: usuário criado', { usuario_id: newId, tipo });
    } else {
      // Usuário já existe
      // Atualiza auth_uid se foi fornecido e usuário não tem
      if (auth_uid && !user.auth_uid) {
        try {
          await UsuarioModel.updateGoogleData(user.usuario_id, auth_uid, foto_url);
          // atualiza o objeto user após alteração
          user = await UsuarioModel.getById(user.usuario_id);
          console.info('googleLogin: auth_uid atualizado para usuário existente', { usuario_id: user.usuario_id });
        } catch (err) {
          console.error('googleLogin: falha ao atualizar auth_uid', err && (err.message || err));
          // não interrompe o fluxo — só logamos (ou você pode querer retornar 500)
        }
      }
    }

    // opcional: criar tokens se as helpers existirem (createAccessToken/createRefreshToken)
    let accessToken = null;
    let refreshToken = null;
    try {
      if (typeof createAccessToken === 'function' && typeof createRefreshToken === 'function') {
        accessToken = createAccessToken({ usuario_id: user.usuario_id });
        refreshToken = createRefreshToken({ usuario_id: user.usuario_id });
      }
    } catch (err) {
      console.warn('googleLogin: erro ao gerar tokens (não crítico para criação de usuário)', err && (err.message || err));
    }

    // Retorna o usuário e, se disponíveis, os tokens
    return res.status(200).json({
      message: 'Login Google bem-sucedido',
      user,
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    console.error('googleLogin error', err && (err.stack || err.message || String(err)));
    return res.status(500).json({ message: 'Erro interno no servidor', error: err && (err.message || String(err)) });
  }
};
      // Prepara dados para atualização (só atualiza o que faz sentido)
      const updateData = {};
      
      // Atualiza nome apenas se não existir ou se o nome do Google for mais completo
      // Preserva o nome existente se já tiver um nome válido
      if (!user.nome || user.nome.trim() === '' || user.nome === email.split('@')[0]) {
        updateData.nome = nome || user.nome || email.split('@')[0];
      }
      
      // Atualiza photo_url apenas se não existir uma foto salva ou se uma nova foto foi fornecida
      if (foto_url && (!user.photo_url || user.photo_url.trim() === '')) {
        updateData.photo_url = foto_url;
      }
      
      // Garante que o tipo está definido (preserva o existente)
      if (!user.tipo && tipoExistente) {
        updateData.tipo = tipoExistente;
      }
      
      // Atualiza apenas se houver mudanças
      if (Object.keys(updateData).length > 0) {
        await UsuarioModel.update(user.usuario_id, updateData);
      }
      
      // Garante que existe registro em ClienteModel ou CuidadorModel conforme o tipo
      if (tipoExistente === 'cliente') {
        const clienteExistente = await ClienteModel.getById(user.usuario_id);
        if (!clienteExistente) {
          await ClienteModel.create({ usuario_id: user.usuario_id });
        }
      } else if (tipoExistente === 'cuidador') {
        const cuidadorExistente = await CuidadorModel.getById(user.usuario_id);
        if (!cuidadorExistente) {
          await CuidadorModel.create({ usuario_id: user.usuario_id });
        }
      }
      
      // Recarrega dados atualizados do banco
      user = await UsuarioModel.getById(user.usuario_id);
    }

    // JWT
    const payload = { id: user.usuario_id, email: user.email };
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    // salva refresh interno
    await TokenModel.create(user.usuario_id, refreshToken);
    await UsuarioModel.setLastLogin(user.usuario_id);

    delete user.senha;

    // Garante que photo_url está presente no retorno
    if (!user.photo_url && foto_url) {
      user.photo_url = foto_url;
    }

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      accessToken,
      user: {
        ...user,
        photo_url: user.photo_url || foto_url || null
      },
      google: true
    });

  } catch (err) {
    console.error('googleLogin error', err);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

/* ------------------------------------------
    REFRESH
-------------------------------------------*/
export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: 'Refresh token ausente' });

    const tokenRow = await TokenModel.findByToken(token);
    if (!tokenRow) return res.status(401).json({ message: 'Refresh token inválido' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      await TokenModel.deleteByToken(token);
      return res.status(401).json({ message: 'Refresh token inválido ou expirado' });
    }

    const accessToken = createAccessToken({
      id: payload.id,
      email: payload.email
    });

    return res.status(200).json({ accessToken });

  } catch (err) {
    console.error('refresh error', err);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

/* ------------------------------------------
    LOGOUT
-------------------------------------------*/
export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      await TokenModel.deleteByToken(token);
    }

    // limpa cookie
    res.setHeader('Set-Cookie', 'refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax;');

    return res.status(200).json({ message: 'Deslogado' });

  } catch (err) {
    console.error('logout error', err);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

/* ------------------------------------------
    GET USER DATA (buscar dados completos do banco)
-------------------------------------------*/
export const getUserData = async (req, res) => {
  try {
    // Extrai ID da query string ou da URL
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const id = urlObj.searchParams.get('id') || req.query?.id;
    
    if (!id) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    let user = null;
    
    // Tenta como número inteiro primeiro (ID do banco)
    const userId = parseInt(id, 10);
    if (!isNaN(userId)) {
      user = await UsuarioModel.getById(userId);
    }
    
    // Se não encontrou e o ID parece ser UUID ou string, tenta buscar por email ou auth_uid
    if (!user) {
      // Se for UUID do Supabase, tenta buscar por auth_uid
      if (id.includes('-') && id.length > 20) {
        user = await UsuarioModel.findByAuthUid(id);
      }
      
      // Se ainda não encontrou, tenta buscar por email (caso o ID seja email)
      if (!user && id.includes('@')) {
        user = await UsuarioModel.findByEmail(id);
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    const finalUserId = user.usuario_id || user.id;
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Remove senha dos dados retornados
    delete user.senha;

    // Monta objeto de endereço a partir dos campos do banco
    const endereco = {};
    if (user.rua) endereco.rua = user.rua;
    if (user.numero) endereco.numero = user.numero;
    if (user.complemento) endereco.complemento = user.complemento;
    if (user.bairro) endereco.bairro = user.bairro;
    if (user.cidade) endereco.cidade = user.cidade;
    if (user.estado) endereco.estado = user.estado;
    if (user.cep) endereco.cep = user.cep;

    // Busca dados específicos conforme tipo
    let additionalData = {};
    if (user.tipo === 'cliente') {
      const cliente = await ClienteModel.getById(finalUserId);
      if (cliente) {
        additionalData = {
          historico_contratacoes: cliente.historico_contratacoes,
          preferencias: cliente.preferencias
        };
      }
    } else if (user.tipo === 'cuidador') {
      const cuidador = await CuidadorModel.getById(finalUserId);
      if (cuidador) {
        additionalData = {
          tipos_cuidado: cuidador.tipos_cuidado,
          descricao: cuidador.descricao,
          valor_hora: cuidador.valor_hora,
          especialidades: cuidador.especialidades,
          experiencia: cuidador.experiencia,
          horarios_disponiveis: cuidador.horarios_disponiveis,
          idiomas: cuidador.idiomas,
          formacao: cuidador.formacao,
          local_trabalho: cuidador.local_trabalho
        };
      }
    }

    return res.status(200).json({
      user: {
        ...user,
        ...additionalData,
        endereco: Object.keys(endereco).length > 0 ? endereco : null,
        photoURL: user.photo_url || null,
        primeiroNome: (user.nome || '').split(' ')[0]
      }
    });

  } catch (err) {
    console.error('getUserData error', err);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
};

export default {
  register,
  login,
  googleLogin,
  refresh,
  logout,
  getUserData
};
