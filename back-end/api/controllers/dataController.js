const moment = require('moment');

exports.getInfoData = (req, res) => {
    const agora = moment();
    
    res.json({
        success: true,
        data: {
            iso: agora.toISOString(),
            formatada: agora.format('DD/MM/YYYY HH:mm:ss'),
            relativa: agora.fromNow(),
            timestamp: agora.valueOf()
        }
    });
};
