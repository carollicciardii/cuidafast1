import supabase from './db.js';

class UsuarioModel {
  static async getAll() {
    const { data, error } = await supabase
      .from('usuario')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('usuario_id', id)
      .single();
    
    if (error) throw error;
    return data || null;
  }

  static async create(usuario) {
    const { 
      nome, 
      email, 
      senha, 
      telefone, 
      data_nascimento, 
      firebase_uid,
      tipo,
      photo_url,
      auth_uid
    } = usuario;

    const insertData = {
      nome,
      email,
      senha: senha || null,
      telefone: telefone || null,
      data_nascimento: data_nascimento || null,
      data_cadastro: new Date().toISOString()
    };

    if (firebase_uid) {
      insertData.firebase_uid = firebase_uid;
    }

    if (tipo) {
      insertData.tipo = tipo;
    }

    if (photo_url) {
      insertData.photo_url = photo_url;
    }

    if (auth_uid) {
      insertData.auth_uid = auth_uid;
    }

    const { data, error } = await supabase
      .from('usuario')
      .insert(insertData)
      .select('usuario_id')
      .single();

    if (error) throw error;
    return data.usuario_id;
  }

  static async update(id, usuario) {
    const { nome, email, telefone, data_nascimento, photo_url, tipo, cpf, cpf_numero, cep, rua, numero, bairro, cidade, estado, complemento } = usuario;
    
    const updateData = {};
    if (nome !== undefined) updateData.nome = nome;
    if (email !== undefined) updateData.email = email;
    if (telefone !== undefined) updateData.telefone = telefone;
    if (data_nascimento !== undefined) updateData.data_nascimento = data_nascimento;
    if (photo_url !== undefined) updateData.photo_url = photo_url;
    if (tipo !== undefined) updateData.tipo = tipo;
    
    // Trata CPF (aceita ambos os campos)
    const cpfValue = cpf || cpf_numero;
    if (cpfValue !== undefined) {
      // Remove formatação se necessário
      const cpfLimpo = typeof cpfValue === 'string' ? cpfValue.replace(/\D/g, '') : cpfValue;
      updateData.cpf = cpfLimpo;
      updateData.cpf_numero = cpfLimpo;
    }
    
    // Campos de endereço
    if (cep !== undefined) updateData.cep = cep;
    if (rua !== undefined) updateData.rua = rua;
    if (numero !== undefined) updateData.numero = numero;
    if (bairro !== undefined) updateData.bairro = bairro;
    if (cidade !== undefined) updateData.cidade = cidade;
    if (estado !== undefined) updateData.estado = estado;
    if (complemento !== undefined) updateData.complemento = complemento;
    
    updateData.data_modificacao = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('usuario')
      .update(updateData)
      .eq('usuario_id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data || null;
  }

  static async findByFirebaseUid(uid) {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('firebase_uid', uid)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async findByAuthUid(authUid) {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('auth_uid', authUid)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async setLastLogin(id) {
    const { data, error } = await supabase
      .from('usuario')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('usuario_id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async updatePassword(id, passwordHash) {
    const { data, error } = await supabase
      .from('usuario')
      .update({ senha: passwordHash })
      .eq('usuario_id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async findOrCreateByFirebase(uid, email, nome) {
    let usuario = await this.findByFirebaseUid(uid);
    if (!usuario) {
      const insertId = await this.create({ nome, email, senha: null, telefone: null, data_nascimento: null, firebase_uid: uid });
      usuario = await this.getById(insertId);
    }
    return usuario;
  }

  static async updateGoogleData(id, authUid, photoUrl) {
    const updateData = {
      data_modificacao: new Date().toISOString()
    };

    if (authUid) {
      updateData.auth_uid = authUid;
    }

    if (photoUrl) {
      updateData.photo_url = photoUrl;
    }

    const { data, error } = await supabase
      .from('usuario')
      .update(updateData)
      .eq('usuario_id', id)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

export default UsuarioModel;
