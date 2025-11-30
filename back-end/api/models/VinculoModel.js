const supabase = require('./db');

class VinculoModel {
  static async getCuidadorIdByClienteId(cliente_id) {
    const { data, error } = await supabase
      .from('vinculos')
      .select('cuidador_id')
      .eq('cliente_id', cliente_id)
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? data.cuidador_id : null;
  }

  static async getClienteIdByCuidadorId(cuidador_id) {
    const { data, error } = await supabase
      .from('vinculos')
      .select('cliente_id')
      .eq('cuidador_id', cuidador_id)
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? data.cliente_id : null;
  }

  static async create(cliente_id, cuidador_id) {
    const { error } = await supabase
      .from('vinculos')
      .insert({
        cliente_id,
        cuidador_id
      });

    if (error) throw error;
    return true;
  }

  static async delete(cliente_id, cuidador_id) {
    const { data, error } = await supabase
      .from('vinculos')
      .delete()
      .eq('cliente_id', cliente_id)
      .eq('cuidador_id', cuidador_id)
      .select();

    if (error) throw error;
    return data ? data.length > 0 : false;
  }
}

module.exports = VinculoModel;
