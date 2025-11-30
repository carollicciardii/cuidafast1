import { getTokens } from '../../back-end/api/controllers/tokenController.js';
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ message: 'Rota de tokens - em desenvolvimento' });
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
}