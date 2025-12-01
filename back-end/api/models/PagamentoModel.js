import supabase from './db.js';

class PagamentoModel {
  static async getAll() {
    const { data, error } = await supabase.from('pagamento').select('*');
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('pagamento')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async create(pagamento) {
    const {
      consulta_id,
      contratar_id,
      cliente_id,
      cuidador_id,
      data_pagamento,
      valor,
      metodo_pagamento,
      status,
      referencia,
      external_reference
    } = pagamento;

    const { data, error } = await supabase
      .from('pagamento')
      .insert({
        consulta_id,
        contratar_id,
        cliente_id,
        cuidador_id,
        data_pagamento,
        valor,
        metodo_pagamento,
        status,
        referencia,
        external_reference
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async update(id, pagamento) {
    const { data_pagamento, valor, metodo_pagamento, status, referencia } = pagamento;

    const { data, error } = await supabase
      .from('pagamento')
      .update({
        data_pagamento,
        valor,
        metodo_pagamento,
        status,
        referencia,
        criado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async delete(id) {
    const { data, error } = await supabase.from('pagamento').delete().eq('id', id).select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

export default PagamentoModel;

