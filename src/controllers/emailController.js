const emailService = require("../services/emailService");
const { db } = require("../config/firebase");
const pdf = require('../services/pdfService');

exports.handleSendMailCheckin = async (req, res) => {
    const { nameClient, mailClient, mailSeller, checkIn } = req.body;
    
    if (!nameClient || !mailClient || !checkIn || !mailSeller) {
        return res.status(400).json({ success: false, message: "Parâmetros inválidos." });
    }

    const checkInsArray = Array.isArray(checkIn) ? checkIn : [checkIn];

    try {
        const emailRef = await db.collection("emails").add({
            nameClient,
            mailClient,
            mailSeller,
            checkInIds: checkInsArray.map(c => c.id),
            status: "pendente",
            createdAt: new Date(),
        });

        const emailId = emailRef.id;
        console.log(`[INFO] Email registrado com ID: ${emailId} para ${checkInsArray.length} check-ins`);

        res.status(200).json({ success: true, emailId });

        processEmailSend(nameClient, emailId, mailClient, mailSeller, checkInsArray);

    } catch (error) {
        console.error("[ERROR] Erro ao registrar o envio de e-mail:", error.message);
        res.status(500).json({ success: false, message: "Erro ao registrar o envio de e-mail." });
    }
};

async function processEmailSend(nameClient, emailId, mailClient, mailSeller, checkIns) {
    try {
        console.log(`[INFO] Processando envio de e-mail para ID: ${emailId} com ${checkIns.length} check-ins`);

        const checkinDocs = await Promise.all(
            checkIns.map(checkIn => db.collection("checkin").doc(checkIn.id).get())
        );

        const validCheckins = checkinDocs
            .filter(doc => doc.exists)
            .map(doc => ({ id: doc.id, ...doc.data() }));

        if (validCheckins.length === 0) {
            console.error(`[ERROR] Nenhum dos check-ins foi encontrado.`);
            await db.collection("emails").doc(emailId).update({ status: "erro", errorMessage: "Nenhum check-in encontrado" });
            return;
        }

        const password = validCheckins[0].senha;

        console.log(`[INFO] Senha utilizada para autenticação: ${password}`);
        // console.log(`[INFO] Gerando único PDF para todos os check-ins...`);

        let pdfBuffer;
        // if (validCheckins.length < 5) {
        //     console.log(`[INFO] Gerando único PDF para todos os check-ins...`);
        //     try {
        //         pdfBuffer = await pdf.createPDFCheckin(validCheckins);
        //         console.log(`[SUCCESS] PDF único gerado com sucesso!`);
        //     } catch (error) {
        //         console.error(`[ERROR] Falha ao gerar PDF único. Enviando sem anexo.`, error.message);
        //         pdfBuffer = null;
        //     }
        // } else {
        //     console.log(`[INFO] Mais de 10 check-ins. PDF não será gerado para evitar processamento desnecessário.`);
        // }

        await emailService.sendMailCheckin(nameClient, emailId, mailClient, mailSeller, password, validCheckins, pdfBuffer);

    } catch (error) {
        console.error(`[ERROR] Falha ao processar envio de e-mail para ID: ${emailId}`, error.message);

        await db.collection("emails").doc(emailId).update({
            status: "erro",
            errorMessage: error.message,
        });
    }
}

exports.checkEmailStatus = async (req, res) => {
    const { emailId } = req.params;

    if (!emailId) {
        return res.status(400).json({ success: false, message: "ID do e-mail não informado." });
    }

    try {
        const emailDoc = await db.collection("emails").doc(emailId).get();

        if (!emailDoc.exists) {
            return res.status(404).json({ success: false, message: "Registro de e-mail não encontrado." });
        }

        const emailData = emailDoc.data();
        return res.status(200).json({ 
            success: true, 
            status: emailData.status, 
            errorMessage: emailData.errorMessage || null 
        });

    } catch (error) {
        console.error("[ERROR] Erro ao buscar status do e-mail:", error.message);
        res.status(500).json({ success: false, message: "Erro ao buscar status do e-mail." });
    }
};

exports.handleSendMailReport = async(req, res) => {
    const { nameClient, mailClient, mailSeller, reportId, data } = req.body;

    if (!mailClient || !reportId || !mailSeller) {
        return res.status(400).json({ success: false, message: "Parâmetros inválidos." });
    }

    try {
        const reportRef = db.collection("relatorios").doc(reportId);
        const reportDoc = await reportRef.get();

        if (!reportDoc.exists) {
            return res.status(404).json({ success: false, message: "Relatório não encontrado." });
        }

        const password = reportDoc.data().senha;

        await emailService.sendMailReport(nameClient, mailClient, mailSeller, reportId, password, data);

        res.status(200).json({ success: true, message: "E-mail enviado com sucesso!" });
    } catch (error) {
        console.error("[ERROR] Erro ao enviar o e-mail:", error.message);
        res.status(500).json({ success: false, message: "Erro ao enviar o e-mail." });
    }
}
