const supabase = require('./db');

class NotificacaoModel {
  static async getAll() {
    const { data, error } = await supabase
      .from('notificacao')
      .select('*');
    
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
    const { data, error } = await supabase
      .from('notificacao')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

module.exports = NotificacaoModel;

