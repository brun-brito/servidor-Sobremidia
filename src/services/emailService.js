const nodemailer = require('nodemailer');
const juice = require('juice');

async function sendMailReport(mailClient, mailSeller, report){

    const inlineHtml = juice(report);

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: process.env.MAIL_SENDER, pass: process.env.MAIL_PASSWORD }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: [mailClient, mailSeller],
        subject: "Relatório de checkin",
        html: inlineHtml,
    }
    
    try {
        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        throw new Error(`Erro ao enviar o email: ${error.message}`);
    }
}

module.exports = { sendMailReport };