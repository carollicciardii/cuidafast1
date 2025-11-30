import supabase from './db.js';

class TokenModel {
  static async create(userId, token) {
    const { data, error } = await supabase
      .from('tokens')
      .insert({
        user_id: userId,
        token
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async findByToken(token) {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('token', token)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  static async deleteByToken(token) {
    const { data, error } = await supabase
      .from('tokens')
      .delete()
      .eq('token', token)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  static async deleteAllForUser(userId) {
    const { data, error } = await supabase
      .from('tokens')
      .delete()
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }
}

export default TokenModel;
