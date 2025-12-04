
class MensagemModel {
  static async getAll() {
    const { data, error } = await supabase
      .from('mensagem')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('mensagem')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async create(mensagem) {
    const { remetente_id, destinatario_id, conteudo } = mensagem;
    
    const { data, error } = await supabase
      .from('mensagem')
      .insert({
        remetente_id,
        destinatario_id,
        conteudo
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async update(id, mensagem) {
    const { conteudo } = mensagem;
    
    const { data, error } = await supabase
      .from('mensagem')
      .update({
        conteudo,
        data_modificacao: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async delete(id) {
    const { data, error } = await supabase
      .from('mensagem')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

module.exports = MensagemModel;

