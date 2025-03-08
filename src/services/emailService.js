const nodemailer = require('nodemailer');
const juice = require('juice');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAIL_SENDER,
        pass: process.env.MAIL_PASSWORD
    }
});

async function sendMailCheckin(mailClient, mailSeller, checkinId, password){
    const reportLink = `https://us-central1-sobremidia-ce.cloudfunctions.net/v1/checkin/html/${checkinId}`;

    const inlineHtml = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f4f4f4;">
            <div style="max-width: 500px; margin: auto; padding: 20px; background: white; border-radius: 5px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #24d464;">Seu Relatório Está Pronto!</h2>
                <p>Olá,</p>
                <p>O relatório de checkin já está disponível para acesso. Utilize o link abaixo:</p>
                <a href="${reportLink}" style="display: inline-block; background: #24d464; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Acessar Relatório</a>
                <p><strong>Senha de acesso:</strong> <span style="background: #f1f1f1; padding: 5px 10px; border-radius: 5px;">${password}</span></p>
                <p>Não compartilhe esta senha com terceiros.</p>
                <hr style="border: none; border-top: 1px solid #ccc;">
                <p>Atenciosamente,</p>
                <p><strong>Equipe Sobremídia</strong></p>
            </div>
        </div>
    `;
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

async function sendMailReport(mailClient, mailSeller, reportId, password) {
    const reportLink = `https://us-central1-sobremidia-ce.cloudfunctions.net/v1/reports/html/${reportId}`;

    // HTML formatado para o e-mail
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f4f4f4;">
            <div style="max-width: 500px; margin: auto; padding: 20px; background: white; border-radius: 5px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #24d464;">Seu Relatório Está Pronto!</h2>
                <p>Olá,</p>
                <p>O relatório de inserções já está disponível para acesso. Utilize o link abaixo:</p>
                <a href="${reportLink}" style="display: inline-block; background: #24d464; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Acessar Relatório</a>
                <p><strong>Senha de acesso:</strong> <span style="background: #f1f1f1; padding: 5px 10px; border-radius: 5px;">${password}</span></p>
                <p>Não compartilhe esta senha com terceiros.</p>
                <hr style="border: none; border-top: 1px solid #ccc;">
                <p>Atenciosamente,</p>
                <p><strong>Equipe Sobremídia</strong></p>
            </div>
        </div>
    `;

    const inlineHtml = juice(emailHtml);

    const mailOptions = {
        from: `"OPEC | Sobremídia" <${process.env.MAIL_SENDER}>`,
        to: [mailClient, mailSeller],
        subject: "Relatório de Inserções - Acesso",
        html: inlineHtml
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        throw new Error(`Erro ao enviar o email: ${error.message}`);
    }
}

async function sendMailWarning(report){

    const inlineHtml = juice(report);

    const mailOptions = {
        from: `"OPEC | Sobremídia" <${process.env.MAIL_SENDER}>`,
        to: ["brunocaudebrito@gmail.com","opec@sobremidia.com"],
        subject: "Relatório de Mídias com menos de 510 inserções",
        html: inlineHtml,
    }
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[INFO] E-mail enviado com sucesso para (${mailOptions.to}):`, info.response);
    } catch (error) {
        console.error(`[ERROR] Falha ao enviar e-mail: ${error.message}`);
    }
}

module.exports = { sendMailCheckin, sendMailWarning, sendMailReport };