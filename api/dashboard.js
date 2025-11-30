const DashboardController = require('../back-end/api/controllers/dashboardController');

module.exports = (req, res) => {
  if (req.method === "GET") {
    return DashboardController.getDashboard(req, res);
  }
  res.status(405).json({ error: "Method Not Allowed" });
};
