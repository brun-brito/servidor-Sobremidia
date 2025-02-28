const nodemailer = require('nodemailer');
const juice = require('juice');
require('dotenv').config();

async function sendMailReport(mailClient, mailSeller, report){

    const inlineHtml = juice(report);

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: process.env.MAIL_SENDER, pass: process.env.MAIL_PASSWORD }
    });

    const mailOptions = {
        from: `"OPEC | Sobremídia" <${process.env.MAIL_SENDER}>`,
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

async function sendMailWarning(report){

    const inlineHtml = juice(report);

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: process.env.TEST_MAIL_SENDER, pass: process.env.TEST_MAIL_PASSWORD }
    });

    const mailOptions = {
        from: `"OPEC | Sobremídia" <${process.env.TEST_MAIL_SENDER}>`,
        to: ["brunocaudebrito@gmail.com"],
            // , "opec@sobremidia.com"],
        subject: "Relatório de Mídias com menos de 510 inserções",
        html: inlineHtml,
    }
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("[INFO] E-mail enviado com sucesso:", info.response);
    } catch (error) {
        console.error(`[ERROR] Falha ao enviar e-mail: ${error.message}`);
    }
}

module.exports = { sendMailReport, sendMailWarning };