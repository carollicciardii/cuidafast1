const { auth } = require('./firebaseAdmin');
const UsuarioModel = require('../models/UsuarioModel');

async function loginWithGoogle(token) {
  try {
    const decoded = await auth.verifyIdToken(token);
    const { uid, email, name } = decoded;

    if (!email) throw new Error("Email não encontrado no token");

    const usuario = await UsuarioModel.findOrCreateByFirebase(uid, email, name || 'Usuário');

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      firebase_uid: uid
    };
  } catch (error) {
    console.error('Erro no login com Google:', error);
    throw new Error("Token inválido ou erro interno");
  }
}

async function verifyToken(token) {
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    throw new Error("Token inválido");
  }
}

module.exports = { loginWithGoogle, verifyToken };
