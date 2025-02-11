const emailService = require('../services/emailService');

// Controlador para lidar com a requisição de envio de email
const sendEmail = async (req, res) => {
    const { mailClient, mailSeller, report } = req.body;

    if (!mailClient || !mailSeller || !report) {
        return res.status(400).json({ error: 'Campos obrigatórios: mailClient, mailSeller, report.' });
    }

    try {
        const result = await emailService.sendMailReport(mailClient, mailSeller, report);
        res.status(200).json({ message: 'Email enviado com sucesso!', result });
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { sendEmail };