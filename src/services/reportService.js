const axios = require("axios");
const pako = require("pako");
const { SECRET_TOKEN1, SECRET_TOKEN2, BASE_URL } = require("../config");
const analyzeLogs = require("../utils/analyzeLogs");
const { db }= require("../config/firebase");

async function generateReport(req, res) {
    const { startDate, startTime, endDate, endTime, mediaId, playerId, clientes, user } = req.body;

    const requestBody = {
        type: "detailed",
        filter: {
            startDate,
            startTime,
            endDate,
            endTime,
            mediaId: Array.isArray(mediaId) ? mediaId : [],
            playerId: Array.isArray(playerId) ? playerId : [],
            sort: -1
        },
    };

    try {
        console.log("[INFO] Enviando requisição para gerar o relatório...");
        const postResponse = await axios.post(`${BASE_URL}/v1/reports`, requestBody, {
            headers: {
                "Content-Type": "application/json",
                "Secret-Token": SECRET_TOKEN1,
            },
        });

        if (!postResponse.data || !postResponse.data.id) {
            return res.status(502).json({ success: false, error: "Falha ao obter ID do relatório." });
        }

        const reportId = postResponse.data.id.toString();
        await db.collection("relatorios").doc(reportId).set({
            reportId: reportId,
            startDate: startDate || null,
            startTime: startTime || null,
            endDate: endDate || null,
            endTime: endTime || null,
            mediaId: Array.isArray(mediaId) ? mediaId : [],
            playerId: Array.isArray(playerId) ? playerId : [],
            status: "PENDENTE",
            url: null,
            createdAt: new Date(),
            clientes: clientes || null,
            senha: Math.random().toString(36).slice(-5),
            user: user || null
        });

        console.log(`[INFO] Relatório criado com sucesso. ID: ${reportId}`);
        
        processReport(reportId);

        return res.status(202).json({ success: true, reportId, status: "PENDENTE" });

    } catch (error) {
        console.error("[ERROR] Erro inesperado:", error.message);
        return res.status(500).json({ success: false, error: "Erro interno no servidor." });
    }    
}

async function processReport(reportId) {
    console.log(`[INFO] Iniciando monitoramento do relatório: ${reportId}`);

    try {
        const reportData = await checkReportStatus(reportId);

        if (!reportData.url) {
            console.error(`[ERROR] O relatório ${reportId} falhou ou ainda não está pronto.`);
            await db.collection("relatorios").doc(reportId).update({
                status: "FALHA"            
            });
            return;
        }

        console.log(`[INFO] Relatório ${reportId} está pronto. URL: ${reportData.url}`);
        await db.collection("relatorios").doc(reportId).update({
            status: "FINALIZADO",
            url: reportData.url
        });

    } catch (error) {
        console.error(`[ERROR] Erro ao processar o relatório ${reportId}:`, error.message);
        await db.collection("relatorios").doc(reportId).update({
            status: "FALHA",
            message: error.message
        });
    }
}

async function checkReportStatus(reportId) {
    const maxAttempts = 60;
    const delay = 5000;

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
        console.log(`[INFO] Tentativa ${attempts} de verificar o status do relatório: ${reportId}`);

        try {
            const response = await axios.get(`${BASE_URL}/v1/reports/${reportId}`, {
                headers: { "Secret-Token": SECRET_TOKEN1 }
            });

            if (response.data.status === "success" && response.data.url) {
                return response.data;
            }

            console.log("[INFO] Relatório ainda em processamento. Aguardando...");
            await new Promise(resolve => setTimeout(resolve, delay));

        } catch (error) {
            if (error.response?.status === 429) {
                console.warn("[WARN] Limite de requisições atingido. Aguardando...");
                await new Promise(resolve => setTimeout(resolve, delay));

            } else {
                console.error("[ERROR] Erro ao verificar status:", error.message);
                throw new Error("Erro ao verificar status do relatório.");
            }
        }
    }

    console.error(`[ERROR] Tempo limite excedido para geração do relatório ${reportId}.`);
    throw new Error("Tempo limite excedido para geração do relatório.");
}

async function getReportStatus(req, res) {
    const { reportId } = req.params;

    try {
        const reportRef = db.collection("relatorios").doc(reportId);
        const reportSnap = await reportRef.get();

        if (!reportSnap.exists) {
            console.error(`[ERROR] Relatório ${reportId} não encontrado.`);
            return res.status(404).json({ success: false, error: "Relatório não encontrado." });
        }

        const reportData = reportSnap.data();
        console.log(`[INFO] Status atual do relatório ${reportId}: ${reportData.status}`);

        return res.status(200).json({
            success: true,
            status: reportData.status,
            message: reportData.message || "-"
        });

    } catch (error) {
        console.error(`[ERROR] Erro ao obter status do relatório ${reportId}:`, error.message);
        return res.status(500).json({ success: false, error: "Erro interno ao obter status do relatório." });
    }
}

async function getReportResult(req, res) {
    const { reportId } = req.params;

    try {
        const reportRef = db.collection("relatorios").doc(reportId);
        const reportSnap = await reportRef.get();

        if (!reportSnap.exists) {
            console.error(`[ERROR] Relatório ${reportId} não encontrado.`);
            return res.status(404).json({ success: false, error: "Relatório não encontrado." });
        }

        const reportData = reportSnap.data();

        if (reportData.status !== "FINALIZADO" || !reportData.url) {
            console.error(`[ERROR] Relatório ${reportId} ainda não está pronto.`);
            return res.status(400).json({ success: false, error: "Relatório ainda não está pronto." });
        }

        console.log(`[INFO] Processando relatório ${reportId} a partir da URL ${reportData.url}`);
        
        try {
            const processedData = await downloadAndProcessReport(reportData.url);
            return res.status(200).json({ success: true, data: processedData });
        } catch (error) {
            console.error(`[ERROR] Erro ao processar relatório ${reportId}:`, error.message);

            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message || "Erro interno ao processar o relatório."
            });
        }

    } catch (error) {
        console.error(`[ERROR] Erro inesperado ao obter resultado do relatório ${reportId}:`, error.message);
        return res.status(500).json({
            success: false,
            error: "Erro interno ao obter o relatório."
        });
    }
}

async function downloadAndProcessReport(reportUrl) {
    console.log(`[INFO] Baixando e processando relatório de: ${reportUrl}`);

    const response = await axios.get(reportUrl, { responseType: "arraybuffer" });

    if (response.data.byteLength === 0) {
        throw new Error("O relatório foi gerado, mas está vazio. Verifique os filtros aplicados ou tente novamente.");
    }

    const compressedData = new Uint8Array(response.data);
    const decompressedData = pako.ungzip(compressedData, { to: "string" });

    if (!decompressedData || decompressedData.length === 0) {
        throw new Error("O relatório foi gerado, mas está vazio. Verifique os filtros aplicados ou tente novamente.");
    }

    const logs = decompressedData.trim().split("\n").map((line, index) => {
        try {
            return JSON.parse(line);
        } catch (error) {
            console.error(`[ERROR] Linha inválida no arquivo descompactado (linha ${index + 1}):`, line);
            return null;
        }
    }).filter(Boolean);

    if (logs.length === 0) {
        throw new Error("O relatório foi gerado, mas não contém dados. Tente usar outro filtro.");
    }

    return analyzeLogs(logs);
}

module.exports = { generateReport, getReportStatus, getReportResult, downloadAndProcessReport };
