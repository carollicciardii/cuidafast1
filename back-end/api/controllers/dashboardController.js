const pool = require('../models/db');

class DashboardController {
    static async getDashboard(req, res) {
        try {
            const [totalConsultas] = await pool.query(
                "SELECT COUNT(*) AS total_consultas FROM contratar"
            );

            const [totalUsuarios] = await pool.query(
                "SELECT COUNT(*) AS total_usuarios FROM usuario"
            );

            const [avaliacaoMedia] = await pool.query(
                "SELECT AVG(avaliacao) AS media_avaliacao FROM cuidador"
            );

            const [atividadeMensal] = await pool.query(
                `SELECT MONTH(data_criacao) AS mes, COUNT(*) AS total
                 FROM contratar
                 WHERE YEAR(data_criacao) = YEAR(CURDATE())
                 GROUP BY MONTH(data_criacao)`
            );

            res.json({
                totalConsultas: totalConsultas[0].total_consultas,
                totalUsuarios: totalUsuarios[0].total_usuarios,
                avaliacaoMedia: parseFloat(avaliacaoMedia[0].media_avaliacao).toFixed(2),
                atividadeMensal
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao carregar dashboard' });
        }
    }
}

module.exports = DashboardController;
const pool = require('../models/db');

async function getDashboard(req, res) {
    try {
        // Exemplo de query usando o pool
        const [totalConsultas] = await pool.query(
            "SELECT COUNT(*) AS total_consultas FROM contratar WHERE status IN ('em andamento','concluida')"
        );

        res.json({
            totalConsultas: totalConsultas[0].total_consultas
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao carregar dashboard' });
    }
}

module.exports = { getDashboard };


