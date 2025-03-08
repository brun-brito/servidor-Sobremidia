const emailService = require("../services/emailService");
const { db } = require("../config/firebase");

async function handleSendMailCheckin(req, res) {
    const { mailClient, mailSeller, checkinId } = req.body;
    
      if (!mailClient || !checkinId || !mailSeller) {
          return res.status(400).json({ success: false, message: "Parâmetros inválidos." });
      }
  
      try {
          const reportRef = db.collection("checkin").doc(checkinId);
          const reportDoc = await reportRef.get();
  
          if (!reportDoc.exists) {
              return res.status(404).json({ success: false, message: "Relatório não encontrado." });
          }
  
          const password = reportDoc.data().senha;
  
          await emailService.sendMailCheckin(mailClient, mailSeller, checkinId, password);
  
          res.status(200).json({ success: true, message: "E-mail enviado com sucesso!" });
      } catch (error) {
          console.error("[ERROR] Erro ao enviar o e-mail:", error.message);
          res.status(500).json({ success: false, message: "Erro ao enviar o e-mail." });
      }
  }

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

module.exports = { handleSendMailCheckin, handleSendMailReport };