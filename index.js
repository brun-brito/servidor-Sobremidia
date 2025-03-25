const functions = require("firebase-functions");
const app = require("./src/app");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { generateDailyReport, waitForReport, processReportResult } = require("./src/services/verificaInsercoesService");
const { updateDailyAnalytics } = require("./src/utils/dailyAnalyticsUpdate");

exports.verifica_insercoes = onSchedule(
    {
        schedule: "0 2 * * *", // Todos os dias às 02:00
        timeZone: "America/Sao_Paulo", // Timezone SP
        retryCount: 5, // Tentará rodar novamente até 3 vezes em caso de falha
        maxRetrySeconds: 180, // Tempo máximo de re-tentativas (3 minutos)
        minBackoffSeconds: 30, // Tempo mínimo entre tentativas (30s)
        maxBackoffSeconds: 120, // Tempo máximo entre tentativas (2 minutos)
        maxDoublings: 2, // O tempo entre re-tentativas dobrará até 2 vezes
        timeoutSeconds: 300, // Tempo máximo de execução (5 minutos)
    },
    async (event) => {
        console.log("[INFO] Iniciando função verifica_insercoes...");

        try {
            console.log("[INFO] Gerando relatório diário...");
            const reportData = await generateDailyReport();
            console.log("[INFO] Report ID:", reportData?.reportId);

            if (!reportData || !reportData.reportId) {
                console.error("[ERROR] Nenhum relatório gerado.");
                return;
            }

            console.log("[INFO] Aguardando resultado do relatório...");
            const reportResult = await waitForReport(reportData.reportId);
            console.log("[INFO] Resultado recebido.");

            console.log("[INFO] Processando relatório...");
            await processReportResult(reportResult, reportData.mediaToDetailsMap);

            console.log("[INFO] Processo concluído com sucesso!");
        } catch (error) {
            console.error("[ERROR] Erro inesperado:", error);
        }
    }
);

exports.atualiza_analytics = onSchedule(
    {
        schedule: "0 7 * * *", // Todos os dias às 07:00
        timeZone: "America/Sao_Paulo", // Timezone SP
        retryCount: 5, // Tentará rodar novamente até 3 vezes em caso de falha
        maxRetrySeconds: 180, // Tempo máximo de re-tentativas (3 minutos)
        minBackoffSeconds: 30, // Tempo mínimo entre tentativas (30s)
        maxBackoffSeconds: 120, // Tempo máximo entre tentativas (2 minutos)
        maxDoublings: 2, // O tempo entre re-tentativas dobrará até 2 vezes
        timeoutSeconds: 300, // Tempo máximo de execução (5 minutos)
    },
    async (event) => {
        console.log("[INFO] Iniciando função atualiza_analytics...");

        try {
            await updateDailyAnalytics();
            console.log("[INFO] Processo concluído com sucesso!");
        } catch (error) {
            console.error("[ERROR] Erro inesperado:", error);
        }
    }
);

// exports.v1 = functions.https.onRequest(app);
exports.v1 = functions
    .https.onRequest(
        {
            memory: "1GiB",
            timeoutSeconds: 300,
        },
        app
    );


/**
 NÃO MEXER!
 */