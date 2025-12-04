const supabase = require('./db');

class ContratarModel {
  static async getAll() {
    const { data, error } = await supabase
      .from('contratar')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('contratar')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async create(contratar) {
    const { cliente_id, cuidador_id, tipo_contratacao, data_inicio, data_fim, status } = contratar;
    
    const { data, error } = await supabase
      .from('contratar')
      .insert({
        cliente_id,
        cuidador_id,
        tipo_contratacao,
        data_inicio,
        data_fim,
        status
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async update(id, contratar) {
    const { tipo_contratacao, data_inicio, data_fim, status } = contratar;
    
    const { data, error } = await supabase
      .from('contratar')
      .update({
        tipo_contratacao,
        data_inicio,
        data_fim,
        status,
        data_modificacao: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async delete(id) {
    const { data, error } = await supabase
      .from('contratar')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

module.exports = ContratarModel;

