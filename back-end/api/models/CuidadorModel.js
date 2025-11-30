import supabase from './db.js';

class CuidadorModel {
  static async getAll() {
    const { data, error } = await supabase
      .from('cuidador')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  static async getById(usuario_id) {
    const { data, error } = await supabase
      .from('cuidador')
      .select('*')
      .eq('usuario_id', usuario_id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async create(cuidador) {
    const { usuario_id, tipos_cuidado, descricao, valor_hora, especialidades, experiencia, avaliacao, horarios_disponiveis, idiomas, formacao, local_trabalho, ganhos } = cuidador;
    
    const insertData = {
      usuario_id
    };

    if (tipos_cuidado !== undefined) insertData.tipos_cuidado = tipos_cuidado;
    if (descricao !== undefined) insertData.descricao = descricao;
    if (valor_hora !== undefined) insertData.valor_hora = valor_hora;
    if (especialidades !== undefined) insertData.especialidades = especialidades;
    if (experiencia !== undefined) insertData.experiencia = experiencia;
    if (avaliacao !== undefined) insertData.avaliacao = avaliacao;
    if (horarios_disponiveis !== undefined) insertData.horarios_disponiveis = horarios_disponiveis;
    if (idiomas !== undefined) insertData.idiomas = idiomas;
    if (formacao !== undefined) insertData.formacao = formacao;
    if (local_trabalho !== undefined) insertData.local_trabalho = local_trabalho;
    if (ganhos !== undefined) insertData.ganhos = ganhos;
    
    const { data, error } = await supabase
      .from('cuidador')
      .insert(insertData)
      .select('usuario_id')
      .single();

    if (error) throw error;
    return data.usuario_id;
  }

  static async update(usuario_id, cuidador) {
    const { tipos_cuidado, descricao, valor_hora, especialidades, experiencia, avaliacao, horarios_disponiveis, idiomas, formacao, local_trabalho, ganhos } = cuidador;
    
    const { data, error } = await supabase
      .from('cuidador')
      .update({
        tipos_cuidado,
        descricao,
        valor_hora,
        especialidades,
        experiencia,
        avaliacao,
        horarios_disponiveis,
        idiomas,
        formacao,
        local_trabalho,
        ganhos
      })
      .eq('usuario_id', usuario_id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async delete(usuario_id) {
    const { data, error } = await supabase
      .from('cuidador')
      .delete()
      .eq('usuario_id', usuario_id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

export default CuidadorModel;
