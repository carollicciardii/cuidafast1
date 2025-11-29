const supabase = require('./db');

class AtividadeCuidadorModel {
  static async getAll() {
    const { data, error } = await supabase
      .from('atividade_cuidador')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('atividade_cuidador')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async create(atividade) {
    const { cuidador_id, tipo_atividade, referencia_id } = atividade;
    
    const { data, error } = await supabase
      .from('atividade_cuidador')
      .insert({
        cuidador_id,
        tipo_atividade,
        referencia_id
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async update(id, atividade) {
    const { tipo_atividade, referencia_id } = atividade;
    
    const { data, error } = await supabase
      .from('atividade_cuidador')
      .update({
        tipo_atividade,
        referencia_id,
        criado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async delete(id) {
    const { data, error } = await supabase
      .from('atividade_cuidador')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

module.exports = AtividadeCuidadorModel;

