// back-end/api/controllers/localizacaoController.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.warn('localizacaoController: falta SUPABASE env vars');
}
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE) : null;

function isValidCoord(v) {
  return typeof v === 'number' && isFinite(v) && Math.abs(v) <= 180;
}

export async function upsertCuidador(req, res) {
  try {
    const authHeader = (req.headers.authorization || '').replace(/^Bearer\s*/i, '');
    // Aqui NÃO usamos firebase-admin: assumimos que a validação do token será feita pelo Supabase (ou que o token passado seja aceito pelo seu backend).
    // Se quiser validar tokens JWT do Supabase, precisamos do JWT secret e checagem - ou copiar a lógica do authController.
    // Para manter simples: aceitamos a requisição autenticada (Vercel + Supabase JWT via Authorization Bearer).

    const usuario_id = (req.body && req.body.usuario_id !== undefined) ? Number(req.body.usuario_id) : null;

    const lat = req.body && Number(req.body.lat);
    const lng = req.body && Number(req.body.lng);
    const accuracy = req.body && (req.body.accuracy ? Number(req.body.accuracy) : null);

    if (!isValidCoord(lat) || !isValidCoord(lng)) {
      return res.status(400).json({ error: 'lat/lng inválidos' });
    }
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase não configurado' });

    const payload = {
      lat, lng, accuracy: accuracy || null, atualizado_em: new Date().toISOString(),
      role: 'cuidador'
    };
    if (usuario_id) payload.usuario_id = usuario_id;

    // Se vier auth_uid no body (quando você mandar explicitamente), usa ele como chave de conflito
    if (req.body && req.body.auth_uid) {
      payload.auth_uid = String(req.body.auth_uid);
    }

    const onConflict = payload.auth_uid ? 'auth_uid' : (payload.usuario_id ? 'usuario_id' : undefined);

    const upsertQuery = supabaseAdmin.from('localizacoes').upsert(payload, onConflict ? { onConflict } : undefined).select();
    const { data, error } = await upsertQuery;

    if (error) {
      console.error('localizacao.upsert supabase error', error);
      return res.status(500).json({ error: 'Erro ao gravar localização', details: error.message || error });
    }
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('localizacao.upsert unexpected', err);
    return res.status(500).json({ error: 'Internal server error', message: String(err) });
  }
}

export async function getClienteLocation(req, res) {
  try {
    const pathParts = (req.url || '').split('/');
    const last = pathParts[pathParts.length - 1];
    const id = Number(last) || Number(req.query?.id) || null;
    if (!id) return res.status(400).json({ error: 'cliente id inválido' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase não configurado' });

    const { data, error } = await supabaseAdmin
      .from('localizacoes')
      .select('*')
      .eq('usuario_id', id)
      .single();

    if (error) {
      console.error('localizacao.getClienteLocation supabase error', error);
      return res.status(500).json({ error: 'Erro ao buscar localização', details: error.message || error });
    }
    if (!data) return res.status(404).json({ error: 'Não encontrada' });
    return res.status(200).json({ lat: data.lat, lng: data.lng, atualizado_em: data.atualizado_em || data.updated_at });
  } catch (err) {
    console.error('localizacao.getClienteLocation unexpected', err);
    return res.status(500).json({ error: 'Internal server error', message: String(err) });
  }
}

export async function getCuidadorLocationByAuthUid(req, res) {
  try {
    const q = req.query || {};
    const auth_uid = q.auth_uid || (req.body && req.body.auth_uid);
    const usuario_id = q.usuario_id || (req.body && req.body.usuario_id);

    if (!auth_uid && !usuario_id) return res.status(400).json({ error: 'auth_uid ou usuario_id obrigatório' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase não configurado' });

    let query = supabaseAdmin.from('localizacoes').select('*');
    if (auth_uid) query = query.eq('auth_uid', String(auth_uid));
    else query = query.eq('usuario_id', Number(usuario_id));

    const { data, error } = await query.single();

    if (error) {
      console.error('localizacao.getCuidadorLocationByAuthUid supabase error', error);
      return res.status(500).json({ error: 'Erro ao buscar localização', details: error.message || error });
    }
    if (!data) return res.status(404).json({ error: 'Não encontrada' });
    return res.status(200).json({ lat: data.lat, lng: data.lng, atualizado_em: data.atualizado_em || data.updated_at });
  } catch (err) {
    console.error('localizacao.getCuidadorLocationByAuthUid unexpected', err);
    return res.status(500).json({ error: 'Internal server error', message: String(err) });
  }
}

export default {
  upsertCuidador,
  getClienteLocation,
  getCuidadorLocationByAuthUid
};
