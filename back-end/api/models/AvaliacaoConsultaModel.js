const supabase = require('./db');

class AvaliacaoConsultaModel {
  static async getAll() {
    const { data, error } = await supabase
      .from('avaliacao_consulta')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('avaliacao_consulta')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async create(avaliacao) {
    const { consulta_id, cliente_id, cuidador_id, nota, comentario } = avaliacao;
    
    const { data, error } = await supabase
      .from('avaliacao_consulta')
      .insert({
        consulta_id,
        cliente_id,
        cuidador_id,
        nota,
        comentario
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async update(id, avaliacao) {
    const { nota, comentario } = avaliacao;
    
    const { data, error } = await supabase
      .from('avaliacao_consulta')
      .update({
        nota,
        comentario,
        criado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async delete(id) {
    const { data, error } = await supabase
      .from('avaliacao_consulta')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

module.exports = AvaliacaoConsultaModel;

