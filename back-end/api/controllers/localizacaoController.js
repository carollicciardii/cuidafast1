// back-end/api/controllers/localizacaoController.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import UsuarioModel from '../../back-end/api/models/UsuarioModel.js';
import ClienteModel from '../../back-end/api/models/ClienteModel.js';
import CuidadorModel from '../../back-end/api/models/CuidadorModel.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE env vars (localizacaoController). Set SUPABASE_URL and SUPABASE_SERVICE_ROLE.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// helper: geocode CEP via Nominatim (OpenStreetMap)
// tenta com postalcode, fallback com city+state if provided
async function geocodeCep(cep) {
  if (!cep) return null;
  // limpa cep
  const cepClean = String(cep).replace(/\D/g, '');
  // Nominatim search by postalcode + country=br
  const url = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(cepClean)}&countrycodes=br&limit=1&addressdetails=1`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'CuidaFast/1.0 (contact: example@example.com)' } });
    if (!r.ok) return null;
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const item = data[0];
    return { lat: parseFloat(item.lat), lng: parseFloat(item.lon), raw: item };
  } catch (err) {
    console.warn('geocodeCep error', err);
    return null;
  }
}

// Upsert localização do cuidador (ou atualiza existente)
export async function upsertCuidador(req, res) {
  try {
    const body = req.body || {};
    const { lat, lng, usuario_id, auth_uid } = body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat e lng são obrigatórios' });
    }

    // montando payload
    const payload = {
      lat: Number(lat),
      lng: Number(lng),
      tipo: 'cuidador',
      atualizado_em: new Date().toISOString()
    };

    if (usuario_id) payload.usuario_id = Number(usuario_id);
    if (auth_uid) payload.auth_uid = auth_uid;

    // upsert usando auth_uid se fornecido, caso contrário usa (usuario_id, tipo)
    let onConflict = null;
    if (auth_uid) onConflict = 'auth_uid';
    else if (usuario_id) onConflict = 'usuario_id';
    else onConflict = null;

    if (onConflict) {
      const { data, error } = await supabaseAdmin
        .from('localizacoes')
        .upsert(payload, { onConflict })
        .select()
        .limit(1);

      if (error) {
        console.error('Supabase upsert localizacoes error', error);
        return res.status(500).json({ error: 'Erro ao gravar localização' });
      }
      return res.status(200).json({ ok: true, location: data?.[0] || payload });
    } else {
      // Sem onConflict — realiza insert simples
      const { data, error } = await supabaseAdmin
        .from('localizacoes')
        .insert([payload])
        .select()
        .limit(1);

      if (error) {
        console.error('Supabase insert localizacoes error', error);
        return res.status(500).json({ error: 'Erro ao gravar localização' });
      }
      return res.status(200).json({ ok: true, location: data?.[0] || payload });
    }
  } catch (err) {
    console.error('upsertCuidador unexpected error', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message });
  }
}

// GET cliente location by usuario_id
// rota esperada: GET /api/localizacao/cliente/:id  (separei por path)
export async function getClienteLocation(req, res) {
  try {
    // tenta extrair id do path (/api/localizacao/cliente/{id})
    let id = null;
    // se vier via query param id
    if (req.query && req.query.id) id = req.query.id;
    // tenta extrair do url path (compat com seu handler)
    if (!id) {
      const match = (req.url || '').match(/\/localizacao\/cliente\/([^?\/]+)/);
      if (match) id = match[1];
    }
    if (!id) {
      return res.status(400).json({ error: 'ID do cliente é obrigatório' });
    }
    const usuarioId = Number(id);
    if (Number.isNaN(usuarioId)) {
      return res.status(400).json({ error: 'ID do cliente inválido' });
    }

    // procura na tabela localizacoes
    const { data, error } = await supabaseAdmin
      .from('localizacoes')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('tipo', 'cliente')
      .limit(1);

    if (error) {
      console.error('Supabase select localizacoes cliente error', error);
      // continua para tentar geocoding do cep
    }

    if (data && data.length > 0) {
      return res.status(200).json({ coordinates: { lat: data[0].lat, lng: data[0].lng }, updated_at: data[0].atualizado_em || data[0].updated_at });
    }

    // se não tem localização, busca CEP no usuario (tabela usuario via model)
    const usuario = await UsuarioModel.getById(usuarioId);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    const cep = usuario.cep || usuario.cep_numero || usuario.cep_num || null;
    if (!cep) return res.status(404).json({ error: 'Localização não encontrada e usuário não tem CEP' });

    // tenta geocodificar cep
    const geoc = await geocodeCep(cep);
    if (!geoc) {
      return res.status(404).json({ error: 'Não foi possível obter coordenadas para o CEP' });
    }

    // grava na tabela localizacoes como cliente
    const payload = {
      usuario_id: usuarioId,
      tipo: 'cliente',
      lat: geoc.lat,
      lng: geoc.lng,
      atualizado_em: new Date().toISOString()
    };

    const insertResult = await supabaseAdmin.from('localizacoes').upsert(payload, { onConflict: 'usuario_id' }).select().limit(1);
    if (insertResult.error) {
      console.error('Erro ao gravar localização a partir do CEP', insertResult.error);
      // mesmo que falhe a gravação, devolvemos as coords para o frontend
      return res.status(200).json({ coordinates: { lat: geoc.lat, lng: geoc.lng }, geocode: geoc.raw });
    }

    const created = insertResult.data?.[0] || payload;
    return res.status(200).json({ coordinates: { lat: created.lat, lng: created.lng }, geocode: geoc.raw });
  } catch (err) {
    console.error('getClienteLocation unexpected error', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message });
  }
}

// GET cuidador location by auth_uid param -> /api/localizacao/cuidador?auth_uid=...
export async function getCuidadorLocationByAuthUid(req, res) {
  try {
    const auth_uid = (req.query && req.query.auth_uid) || (new URL(req.url, `http://${req.headers.host || 'localhost'}`)).searchParams.get('auth_uid');
    if (!auth_uid) return res.status(400).json({ error: 'auth_uid obrigatório' });

    const { data, error } = await supabaseAdmin
      .from('localizacoes')
      .select('*')
      .eq('auth_uid', auth_uid)
      .eq('tipo', 'cuidador')
      .limit(1);

    if (error) {
      console.error('Supabase select localizacoes cuidador error', error);
      return res.status(500).json({ error: 'Erro ao buscar localização' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Localização do cuidador não encontrada' });
    }

    const row = data[0];
    return res.status(200).json({ coordinates: { lat: row.lat, lng: row.lng }, updated_at: row.atualizado_em || row.updated_at });
  } catch (err) {
    console.error('getCuidadorLocationByAuthUid unexpected error', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message });
  }
}

export default {
  upsertCuidador,
  getClienteLocation,
  getCuidadorLocationByAuthUid
};
