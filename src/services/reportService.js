const axios = require("axios");
const pako = require("pako");
const { SECRET_TOKEN, BASE_URL } = require("../config");
const analyzeLogs = require("../utils/analyzeLogs");

async function generateReport(req, res) {
    const { startDate, startTime, endDate, endTime, mediaId, playerId } = req.body;

    const requestBody = {
        type: "detailed",
        filter: {
            startDate,
            startTime,
            endDate,
            endTime,
            mediaId,
            playerId,
            sort: -1,
        },
    };

    try {
        console.log("[INFO] Enviando requisição para gerar o relatório...");
        const postResponse = await axios.post(`${BASE_URL}/v1/reports`, requestBody, {
            headers: {
                "Content-Type": "application/json",
                "Secret-Token": SECRET_TOKEN,
            },
        });

        if (!postResponse.data || !postResponse.data.id) {
            return res.status(502).json({
                success: false,
                error: "Falha ao obter ID do relatório. Resposta inválida da API externa.",
            });
        }

        const reportId = postResponse.data.id;
        console.log(`[INFO] Relatório criado com sucesso. ID: ${reportId}`);

        const reportData = await checkReportStatus(reportId);
        if (!reportData.url) {
            return res.status(502).json({
                success: false,
                error: "A URL do relatório não está disponível. Resposta inválida da API externa.",
            });
        }

        console.log("[INFO] URL do relatório:", reportData.url);
        console.log("[INFO] Relatório pronto. Baixando...");

        try {
            const processedData = await downloadAndProcessReport(reportData.url);

            console.log("[INFO] Relatório processado com sucesso!");
            return res.status(200).json({
                success: true,
                data: processedData,
            });
        } catch (error) {
            if (error.statusCode === 404) {
                console.warn("[WARN] O relatório foi gerado, mas está vazio.");
                return res.status(404).json({
                    success: false,
                    message: error.message,
                });
            }
            throw error;
        }
    } catch (error) {
        handleRequestError(res, error);
    }
}

async function checkReportStatus(reportId) {
    const maxAttempts = 30;
    const delay = 5000;

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
        console.log(`[INFO] Tentativa ${attempts} de verificar o status do relatório...`);

        try {
            const response = await axios.get(`${BASE_URL}/v1/reports/${reportId}`, {
                headers: { "Secret-Token": SECRET_TOKEN }
            });

            if (response.data.status === "success") {
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

    throw new Error("Tempo limite excedido para geração do relatório.");
}

async function downloadAndProcessReport(reportUrl) {
    const response = await axios.get(reportUrl, { responseType: "arraybuffer" });

    if (response.data.byteLength === 0) {
        throw {
            statusCode: 404,
            message: "O relatório foi gerado, mas está vazio. Verifique os filtros aplicados ou tente novamente."
        };
    }

    const compressedData = new Uint8Array(response.data);
    const decompressedData = pako.ungzip(compressedData, { to: "string" });

    if (decompressedData.length === 0) {
        throw {
            statusCode: 404,
            message: "O relatório foi gerado, mas está vazio. Verifique os filtros aplicados ou tente novamente."
        };
    }

    const logs = decompressedData.trim().split("\n").map((line, index) => {
        try {
            return JSON.parse(line);
        } catch (error) {
            console.error(`[ERROR] Linha inválida no arquivo descompactado (linha ${index + 1}):`, line);
            throw error;
        }
    });

    return analyzeLogs(logs);
}

function handleRequestError(res, error) {
    if (error.response) {
        const statusCode = error.response.status || 500;
        const apiError = error.response.data?.details.report[0];

        console.error(`[ERROR] Erro da API externa. Status: ${statusCode}, Erro: ${apiError}`);

        switch (statusCode) {
            case 400:
                return res.status(400).json({
                    success: false,
                    error: `Requisição inválida. Verifique os filtros aplicados: ${apiError}`
                });
            case 429:
                return res.status(429).json({
                    success: false,
                    error: `Limite de requisições atingido. Aguarde antes de tentar novamente: ${apiError}`
                });
            default:
                return res.status(statusCode).json({
                    success: false,
                    error: apiError || "Erro desconhecido na API externa."
                });
        }
    }

    console.error("[ERROR] Erro inesperado:", error.message || error);
    res.status(500).json({
        success: false,
        error: "Erro interno no servidor. Tente novamente mais tarde."
    });
}

module.exports = { generateReport };
