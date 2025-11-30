const supabase = require('./db');

class ConsultaModel {
  static async getAll() {
    const { data, error } = await supabase
      .from('consulta')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('consulta')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async create(consulta) {
    const { contratar_id, cuidador_id, cliente_id, servico_tipo_id, descricao, data_inicio, data_fim, duracao_min, valor_total, status } = consulta;
    
    const { data, error } = await supabase
      .from('consulta')
      .insert({
        contratar_id,
        cuidador_id,
        cliente_id,
        servico_tipo_id,
        descricao,
        data_inicio,
        data_fim,
        duracao_min,
        valor_total,
        status
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async update(id, consulta) {
    const { descricao, data_inicio, data_fim, duracao_min, valor_total, status } = consulta;
    
    const { data, error } = await supabase
      .from('consulta')
      .update({
        descricao,
        data_inicio,
        data_fim,
        duracao_min,
        valor_total,
        status,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async delete(id) {
    const { data, error } = await supabase
      .from('consulta')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

module.exports = ConsultaModel;

