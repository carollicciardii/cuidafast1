// ~/www/back-end/API/controllers/exemploController.js
const moment = require('moment');
require('moment/locale/pt-br'); // opcional para português

exports.getDataFormatada = (req, res) => {
    const agora = moment();
    const dataFormatada = agora.format('DD/MM/YYYY HH:mm:ss');
    
    res.json({
        dataOriginal: new Date(),
        dataFormatada: dataFormatada,
        timestamp: agora.valueOf()
    });
};

// Para usar em modelos/banco de dados
exports.formatarDataBD = (data) => {
    return moment(data).format('YYYY-MM-DD HH:mm:ss');
};
