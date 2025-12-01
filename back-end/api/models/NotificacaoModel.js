import supabase from './db.js';

class NotificacaoModel {
  static async getAll() {
    const { data, error } = await supabase.from('notificacao').select('*');
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('notificacao')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async getByUsuarioId(usuarioId, { filter, limit = 20 } = {}) {
    if (!usuarioId) return [];
    let query = supabase
      .from('notificacao')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('id', { ascending: false })
      .limit(limit);

    if (filter === 'nao_lidas') {
      query = query.eq('status_leitura', 'nao_lida');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async countUnreadByUsuarioId(usuarioId) {
    if (!usuarioId) return 0;

    const { count, error } = await supabase
      .from('notificacao')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('status_leitura', 'nao_lida');

    if (error) throw error;
    return count || 0;
  }

  static async markAllAsRead(usuarioId) {
    if (!usuarioId) return 0;

    const { data, error } = await supabase
      .from('notificacao')
      .update({
        status_leitura: 'lida',
        data_modificacao: new Date().toISOString()
      })
      .eq('usuario_id', usuarioId)
      .eq('status_leitura', 'nao_lida')
      .select('id');

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async markAsRead(id) {
    if (!id) return 0;

    const { data, error } = await supabase
      .from('notificacao')
      .update({
        status_leitura: 'lida',
        data_modificacao: new Date().toISOString()
      })
      .eq('id', id)
      .select('id');

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async create(notificacao) {
    const { usuario_id, titulo, mensagem, status_leitura } = notificacao;

    const { data, error } = await supabase
      .from('notificacao')
      .insert({
        usuario_id,
        titulo,
        mensagem,
        status_leitura
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async update(id, notificacao) {
    const { titulo, mensagem, status_leitura } = notificacao;

    const { data, error } = await supabase
      .from('notificacao')
      .update({
        titulo,
        mensagem,
        status_leitura,
        data_modificacao: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async delete(id) {
    const { data, error } = await supabase.from('notificacao').delete().eq('id', id).select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

export default NotificacaoModel;

