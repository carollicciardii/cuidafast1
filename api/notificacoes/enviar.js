/*import { sendNotification } from '../../../back-end/api/controllers/notificationController';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }


  const body = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });

  try {
    const result = await sendNotification(body);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Erro ao enviar notificação:', err);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
*/
