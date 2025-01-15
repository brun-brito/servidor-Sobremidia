const express = require('express');
const cors = require('cors');
const axios = require('axios');
const pako = require('pako');

const app = express();

app.use(cors());
app.use(express.json());

const SECRET_TOKEN = 'a59202bc005fa4305916bca8aa7e31d0';
const BASE_URL = 'https://api.4yousee.com.br/v1/reports';

app.post('/generate-report', async (req, res) => {
    const { startDate, startTime, endDate, endTime, mediaId, playerId } = req.body;

    // Montar o corpo da requisição para gerar o relatório
    const requestBody = {
        type: "detailed",
        filter: {
            startDate,
            startTime,
            endDate,
            endTime,
            mediaId,
            playerId,
            sort: -1
        }
    };

    try {
        // Enviar requisição para gerar o relatório
        console.log("[INFO] Enviando requisição para gerar o relatório...");
        const postResponse = await axios.post(BASE_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Secret-Token': SECRET_TOKEN
            }
        });

        const reportId = postResponse.data.id;
        console.log(`[INFO] Relatório criado com sucesso. ID: ${reportId}`);

        // Verificar status do relatório até que ele esteja pronto
        const reportData = await checkReportStatus(reportId);
        console.log("[INFO] Relatório pronto. Baixando...");

        // Baixar e descompactar o relatório
        const processedData = await downloadAndProcessReport(reportData.url);
        console.log("[INFO] Relatório processado com sucesso!");

        // Retornar os dados processados para o cliente
        res.json({ success: true, data: processedData });
    } catch (error) {
        console.error("[ERROR] Ocorreu um erro:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Função para verificar o status do relatório
async function checkReportStatus(reportId) {
    const maxAttempts = 30;
    const delay = 5000;

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
        console.log(`[INFO] Tentativa ${attempts} de verificar o status do relatório...`);

        try {
            const response = await axios.get(`${BASE_URL}/${reportId}`, {
                headers: { 'Secret-Token': SECRET_TOKEN }
            });
        
            const status = response.data.status;
            if (status === "success") {
                return response.data;
            }
        
            const retryAfter = response.headers['retry-after'];
            if (retryAfter) {
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            }
        } catch (error) {
            if (error.response && error.response.status === 429) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }        
    }

    throw new Error("Tempo limite excedido para geração do relatório.");
}

// Função para baixar e processar o relatório
async function downloadAndProcessReport(reportUrl) {
    const response = await axios.get(reportUrl, { responseType: 'arraybuffer' });

    console.log("[INFO] Arquivo baixado. Descompactando...");
    const compressedData = new Uint8Array(response.data);
    const decompressedData = pako.ungzip(compressedData, { to: 'string' });

    console.log("[INFO] Arquivo descompactado. Processando dados...");
    const logs = decompressedData.trim().split('\n').map((line, index) => {
        try {
            return JSON.parse(line);
        } catch (error) {
            console.error(`[ERROR] Linha inválida no arquivo descompactado (linha ${index + 1}):`, line);
            throw error;
        }
    });

    return analyzeLogs(logs);
}

// Função para analisar os dados extraídos
function analyzeLogs(logs) {
    const mediaCount = {};
    const panelCount = {};
    const dateCount = {};

    logs.forEach(log => {
        const { date, playerId, mediaId } = log;

        mediaCount[mediaId] = (mediaCount[mediaId] || 0) + 1;
        panelCount[playerId] = (panelCount[playerId] || 0) + 1;
        dateCount[date] = (dateCount[date] || 0) + 1;
    });

    return { mediaCount, panelCount, dateCount };
}

// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`[INFO] Servidor rodando na porta ${PORT}`);
});
