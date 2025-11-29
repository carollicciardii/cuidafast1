const supabase = require('./db');

class ServicoTipoModel {
  static async getAll() {
    const { data, error } = await supabase
      .from('servico_tipo')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('servico_tipo')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async create(servico) {
    const { nome, descricao } = servico;
    
    const { data, error } = await supabase
      .from('servico_tipo')
      .insert({
        nome,
        descricao
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async update(id, servico) {
    const { nome, descricao } = servico;
    
    const { data, error } = await supabase
      .from('servico_tipo')
      .update({
        nome,
        descricao
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async delete(id) {
    const { data, error } = await supabase
      .from('servico_tipo')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

module.exports = ServicoTipoModel;

