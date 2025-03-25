const nodemailer = require('nodemailer');
const juice = require('juice');
require('dotenv').config();
const pdf = require('../services/pdfService');
const { db } = require("../config/firebase");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAIL_SENDER,
        pass: process.env.MAIL_PASSWORD
    }
});

async function sendMailCheckin(emailId, mailClient, mailSeller, password, checkins, pdfBuffer) {
    const checkinIds = checkins.map(checkin => checkin.id).join("&");
    const reportLink = `https://us-central1-sobremidia-ce.cloudfunctions.net/v1/checkin/html/${checkinIds}`;

    const inlineHtml = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f4f4f4;">
            <div style="max-width: 500px; margin: auto; padding: 20px; background: white; border-radius: 5px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #24d464;">Seu Relatório Está Pronto!</h2>
                <p>Olá,</p>
                <p>O relatório de checkin já está disponível para acesso. Para acessar, clique no link abaixo:</p>
                <a href="${reportLink}" style="display: inline-block; background: #24d464; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Acessar Relatório</a>
                <p><strong>Senha de acesso:</strong> <span style="background: #f1f1f1; padding: 5px 10px; border-radius: 5px;">${password}</span></p>
                <p>Não compartilhe esta senha com terceiros.</p>
                <hr style="border: none; border-top: 1px solid #ccc;">
                <p>Atenciosamente,</p>
                <p><strong>Equipe Sobremídia</strong></p>
            </div>
        </div>
    `;

    const dia = new Date();
    const clientesUnicos = [...new Set(checkins.map(c => c.midias?.[0]?.cliente || "Desconhecido"))];
    const clientesFormatados = clientesUnicos.join("_").replace(/\s+/g, "-");
    const fileName = `relatorio_checkin-${clientesFormatados}_${dia.getDate()}-${dia.getMonth() + 1}.pdf`;
    
        const mailOptions = {
        from: `"OPEC | Sobremídia" <${process.env.MAIL_SENDER}>`,
        to: [mailClient, mailSeller],
        subject: "Relatório de checkin",
        html: inlineHtml,
        // attachments: pdfBuffer
        //     ? [{ filename: fileName, content: pdfBuffer, encoding: "base64" }]
        //     : []
    }
    
    try {
        console.log(`[INFO] Enviando e-mail para ${mailClient}, ${mailSeller}`);

        await db.collection("emails").doc(emailId).update({ status: "em andamento" });

        const info = await transporter.sendMail(mailOptions);
        await db.collection("emails").doc(emailId).update({ status: "finalizado" });

        console.log(`[SUCCESS] E-mail enviado com sucesso! ID: ${emailId}`);
        return info;
    } catch (error) {
        console.error(`[ERROR] Falha ao enviar e-mail com anexo para ID: ${emailId}:`, error.message);

        // Tentar enviar novamente SEM o attachment
        try {
            console.log(`[INFO] Tentando reenviar e-mail sem anexo para ID: ${emailId}...`);
            const mailOptionsWithoutAttachment = { ...mailOptions, attachments: [] };

            const infoWithoutAttachment = await transporter.sendMail(mailOptionsWithoutAttachment);
            await db.collection("emails").doc(emailId).update({
                status: "finalizado",
                note: "Enviado sem anexo devido ao tamanho do arquivo."
            });

            console.log(`[SUCCESS] E-mail reenviado sem anexo para ID: ${emailId}`);
            return infoWithoutAttachment;
        } catch (errorRetry) {
            console.error(`[ERROR] Falha ao reenviar e-mail sem anexo para ID: ${emailId}:`, errorRetry.message);
            await db.collection("emails").doc(emailId).update({
                status: "erro",
                errorMessage: `Falha ao enviar com e sem anexo: ${errorRetry.message}`,
            });

            throw new Error(`Erro ao enviar e-mail com e sem anexo: ${errorRetry.message}`);
        }
    }
}

async function sendMailReport(mailClient, mailSeller, reportId, password, data) {
    const reportLink = `https://us-central1-sobremidia-ce.cloudfunctions.net/v1/reports/html/${reportId}`;
    // let pdfBuffer;
    // let sendWithoutPDF = false;
    // try {
    //     console.log("Gerando PDF relatorio...");
    //     pdfBuffer = await pdf.createPDFRelatorio(data);
    //     console.log("PDF gerado com sucesso!");
    // } catch (error) {
    //     console.error("[ERROR] Falha ao gerar o PDF. Tentando enviar sem anexo.", error.message);
    //     sendWithoutPDF = true;
    // }

    // HTML formatado para o e-mail
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f4f4f4;">
            <div style="max-width: 500px; margin: auto; padding: 20px; background: white; border-radius: 5px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #24d464;">Seu Relatório Está Pronto!</h2>
                <p>Olá,</p>
                <p>O relatório de inserções já está disponível para acesso. Para acessar, clique no link abaixo:</p>
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
    const dia = new Date();
    const fileName = `relatorio_completo-${data.clientes}_${dia.getDate()}-${dia.getMonth() + 1}.pdf`;

    const mailOptions = {
        from: `"OPEC | Sobremídia" <${process.env.MAIL_SENDER}>`,
        to: [mailClient, mailSeller],
        subject: "Relatório de Inserções - Acesso",
        html: inlineHtml,
        // attachments: sendWithoutPDF
        //     ? [] // Se falhar envia sem anexo
        //     : [
        //             {
        //                 filename: fileName,
        //                 content: pdfBuffer,
        //                 encoding: "base64"
        //             }
        //         ]
    };

    try {
        console.log("Enviando e-mail...");
        const info = await transporter.sendMail(mailOptions);
        console.log(`E-mail enviado com sucesso para (${mailOptions.to}):`, info.response);
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