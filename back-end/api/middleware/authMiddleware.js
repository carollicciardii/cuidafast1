const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/UsuarioModel');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';

module.exports = async function (req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) return res.status(401).json({ message: 'Token ausente' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UsuarioModel.getById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Usuário não encontrado' });

    delete user.senha;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};