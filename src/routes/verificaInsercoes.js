const express = require("express");
const { generateDailyReport, waitForReport, processReportResult } = require("../services/verificaInsercoesService");

const router = express.Router();

router.get("/", async (req, res) => {
    console.log("[INFO] Rota ativada para iniciar o relatório de mídias com menos de 510 inserções.");

    try {
        const reportData = await generateDailyReport();

        if (reportData && reportData.reportId) {
            console.log(`[INFO] Report ID gerado: ${reportData.reportId}. Iniciando monitoramento...`);
            const reportResult = await waitForReport(reportData.reportId);

            console.log("[INFO] Resultado do relatório recebido. Iniciando processamento...");
            await processReportResult(reportResult, reportData.mediaToDetailsMap);

            return res.status(200).json({ success: true, message: "Processo concluído e e-mail enviado." });
        } else {
            console.log("[ERROR] Falha ao gerar relatório. Nenhum reportId retornado.");
            return res.status(500).json({ success: false, message: "Falha ao gerar relatório." });
        }
    } catch (error) {
        console.error("[ERROR] Erro inesperado no processo:", error);
        return res.status(500).json({ success: false, message: "Erro interno no servidor.", error: error.message });
    }
});

module.exports = router;