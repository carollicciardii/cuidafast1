// back-end/api/controllers/localizacaoController.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE; // service_role key (use com cuidado)
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.warn('localizacaoController: falta SUPABASE env vars');
}
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE) : null;

// tenta carregar firebase-admin helper se existir (arquivo do seu projeto)
let firebaseAdmin = null;
try {
  // seu projeto já tem back-end/api/services/firebaseAdmin.js ? (tente importar)
  // Ele deve exportar o objeto admin do firebase-admin já inicializado.
  // Se não existir, o try/catch falhará e seguiremos usando auth_uid vindo no body.
  const mod = await import('../services/firebaseAdmin.js');
  firebaseAdmin = mod.default || mod.admin || null;
} catch (e) {
  // ok — não há helper; segue sem verificação se o front enviar auth_uid diretamente.
  firebaseAdmin = null;
}

// helper simples para validar float coords
function isValidCoord(v) {
  return typeof v === 'number' && isFinite(v) && Math.abs(v) <= 180;
}

export async function upsertCuidador(req, res) {
  try {
    const authHeader = (req.headers.authorization || '').replace(/^Bearer\s*/i, '');
    let auth_uid = null;

    // tenta verificar token firebase se admin for carregado
    if (authHeader && firebaseAdmin && firebaseAdmin.auth) {
      try {
        const decoded = await firebaseAdmin.auth().verifyIdToken(authHeader);
        auth_uid = decoded.uid;
      } catch (err) {
        console.warn('localizacao.upsert: token firebase inválido', err?.message || err);
        // continua — pode aceitar auth_uid via body se presente
      }
    }

    // se nao validamos via firebase admin, aceite auth_uid vindo no body (útil para testes)
    if (!auth_uid && req.body && req.body.auth_uid) {
      auth_uid = String(req.body.auth_uid);
    }

    // também aceitamos usuario_id (inteiro) quando não houver auth_uid
    const usuario_id = (req.body && req.body.usuario_id !== undefined) ? Number(req.body.usuario_id) : null;

    const lat = req.body && Number(req.body.lat);
    const lng = req.body && Number(req.body.lng);
    const accuracy = req.body && (req.body.accuracy ? Number(req.body.accuracy) : null);

    if (!isValidCoord(lat) || !isValidCoord(lng)) {
      return res.status(400).json({ error: 'lat/lng inválidos' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service não configurado' });
    }

    const payload = {
      lat, lng, accuracy: accuracy || null, atualizado_em: new Date().toISOString(),
      role: 'cuidador'
    };
    if (auth_uid) payload.auth_uid = auth_uid;
    if (usuario_id) payload.usuario_id = usuario_id;

    // upsert por auth_uid ou usuario_id
    const onConflict = auth_uid ? 'auth_uid' : (usuario_id ? 'usuario_id' : 'id');

    const { data, error } = await supabaseAdmin
      .from('localizacoes')
      .upsert(payload, { onConflict })
      .select()
      .single();

    if (error) {
      console.error('localizacao.upsert supabase error', error);
      return res.status(500).json({ error: 'Erro ao gravar localização', details: error.message || error });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('localizacao.upsert unexpected', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message || String(err) });
  }
}

export async function getClienteLocation(req, res, opts = {}) {
  try {
    // URL exemplo: GET /api/auth/localizacao/cliente/123
    const pathParts = (req.url || '').split('/');
    const last = pathParts[pathParts.length - 1];
    const id = Number(last) || Number(req.query?.id) || null;
    if (!id) return res.status(400).json({ error: 'cliente id inválido' });

    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase service não configurado' });

    const { data, error } = await supabaseAdmin
      .from('localizacoes')
      .select('*')
      .eq('usuario_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // not found
        return res.status(404).json({ error: 'Não encontrada' });
      }
      console.error('localizacao.getClienteLocation supabase error', error);
      return res.status(500).json({ error: 'Erro ao buscar localização', details: error.message || error });
    }

    if (!data) return res.status(404).json({ error: 'Não encontrada' });
    return res.status(200).json({ lat: data.lat, lng: data.lng, atualizado_em: data.atualizado_em || data.updated_at });
  } catch (err) {
    console.error('localizacao.getClienteLocation unexpected', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message || String(err) });
  }
}

export async function getCuidadorLocationByAuthUid(req, res) {
  try {
    const q = req.query || {};
    const auth_uid = q.auth_uid || (req.body && req.body.auth_uid);
    const usuario_id = q.usuario_id || (req.body && req.body.usuario_id);

    if (!auth_uid && !usuario_id) return res.status(400).json({ error: 'auth_uid ou usuario_id obrigatório' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase service não configurado' });

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
    return res.status(500).json({ error: 'Internal server error', message: err?.message || String(err) });
  }
}

export default {
  upsertCuidador,
  getClienteLocation,
  getCuidadorLocationByAuthUid
};
