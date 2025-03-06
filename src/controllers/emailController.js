const emailService = require("../services/emailService");
const { db } = require("../config/firebase");

const sendEmail = async (req, res) => {
    console.log("📩 [INFO] Iniciando processamento do email...");

    try {
        const { mailClient, mailSeller, report, pdfBase64 } = req.body;

        if (!mailClient || !mailSeller || !report || !pdfBase64) {
            console.error("❌ [ERROR] Campos obrigatórios faltando.");
            return res.status(400).json({ error: "Campos obrigatórios: mailClient, mailSeller, report e pdfFile." });
        }

        // Converte Base64 para Buffer
        const pdfBuffer = Buffer.from(pdfBase64, "base64");

        console.log("📨 [INFO] Enviando email com anexo...");
        const result = await emailService.sendMailCheckin(mailClient, mailSeller, report, pdfBuffer, "relatorio.pdf");

        console.log("✅ [INFO] Email enviado com sucesso!");
        return res.status(200).json({ message: "Email enviado com sucesso!", result });
    } catch (error) {
        console.error("❌ [ERROR] Erro ao enviar email:", error);
        return res.status(500).json({ error: error.message });
    }
};

async function handleSendMailReport(req, res) {
    const { mailClient, mailSeller, reportId } = req.body;

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

        await emailService.sendMailReport(mailClient, mailSeller, reportId, password);

        res.status(200).json({ success: true, message: "E-mail enviado com sucesso!" });
    } catch (error) {
        console.error("[ERROR] Erro ao enviar o e-mail:", error.message);
        res.status(500).json({ success: false, message: "Erro ao enviar o e-mail." });
    }
}

module.exports = { sendEmail, handleSendMailReport };