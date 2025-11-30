const supabase = require('./db');

class OportunidadeModel {
  static async getAll() {
    const { data, error } = await supabase
      .from('oportunidade')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('oportunidade')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async create(oportunidade) {
    const { cliente_id, cuidador_id, origem, status, valor_estimado, contratacao_id } = oportunidade;
    
    const { data, error } = await supabase
      .from('oportunidade')
      .insert({
        cliente_id,
        cuidador_id,
        origem,
        status,
        valor_estimado,
        contratacao_id
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async update(id, oportunidade) {
    const { origem, status, valor_estimado, contratacao_id } = oportunidade;
    
    const { data, error } = await supabase
      .from('oportunidade')
      .update({
        origem,
        status,
        valor_estimado,
        contratacao_id,
        data_criacao: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async delete(id) {
    const { data, error } = await supabase
      .from('oportunidade')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

module.exports = OportunidadeModel;

