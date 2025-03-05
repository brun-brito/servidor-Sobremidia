const axios = require('axios');
const moment = require('moment');   
const { generateReport, getReportStatus, getReportResult } = require("./reportService");
const { sendMailWarning } = require('./emailService');

const API_URL = 'https://api.4yousee.com.br/v1/playlists';
const SECRET_TOKEN = '1d6ec138a282a26de4f1558c22f0a9ea';
const today = moment().format("YYYY-MM-DD");
let yesterday;
// let startDate;
// let endDate;

// Função para buscar todas as páginas da API
async function fetchAllPlaylists() {
    let playlists = [];
    let mediaToDetailsMap = {};
    let page = 1;
    let totalPages = 1;

    do {
        try {
            const response = await axios.get(`${API_URL}?page=${page}`, {
                headers: { 'Secret-Token': SECRET_TOKEN }
            });

            const data = response.data;
            playlists = playlists.concat(data.results);
            totalPages = data.totalPages || 1;
            page++;

            data.results.forEach(playlist => {
                const playlistName = playlist.name;

                playlist.items.forEach(item => {
                    if (item.type === 'carousel') {
                        const carouselName = item.name;

                        item.items.forEach(media => {
                            if (media.type === 'media') {
                                mediaToDetailsMap[media.id] = {
                                    playlist: playlistName,
                                    carrossel: carouselName,
                                    media: media.name,
                                };
                            }
                        });
                    }
                });
            });

        } catch (error) {
            console.error(`Erro ao buscar playlists na página ${page}:`, error.message);
            break;
        }
    } while (page <= totalPages);

    return { playlists, mediaToDetailsMap };
}

async function generateDailyReport() {
    console.log("[INFO] Iniciando a coleta de playlists...");
    const { playlists, mediaToDetailsMap } = await fetchAllPlaylists();

    console.log("[INFO] Extraindo mídias ativas...");
    const reportData = extractActiveMedia(playlists);

    if (reportData.length === 0) {
        console.log("[INFO] Nenhuma mídia ativa encontrada.");
        return null;
    }

    const mediaIds = reportData.flatMap(item => item.mediaIds);
    yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    // yesterday = '2025-02-07';
    // startDate = "2025-02-01",
    // endDate = '2025-02-26',

    console.log('[INFO] Gerando relatório...');
    try {
        const fakeReq = { 
            body: { 
                startDate: yesterday,
                startTime: "00:00:00", 
                endDate: yesterday,
                endTime: "23:59:59", 
                mediaId: mediaIds, 
                playerId: [] 
            } 
        };
        
        const fakeRes = { 
            status: (code) => ({ json: (data) => ({ statusCode: code, ...data }) }) 
        };
        
        const reportResponse = await generateReport(fakeReq, fakeRes);

        if (!reportResponse.success) {
            console.log("[ERROR] Erro ao gerar o relatório.");
            return null;
        }

        console.log(`[INFO] Relatório gerado com sucesso. ID: ${reportResponse.reportId}`);
        return { reportId: reportResponse.reportId, mediaToDetailsMap };

    } catch (error) {
        console.error("[ERROR] Erro ao gerar relatório:", error.message);
        return null;
    }
}

function extractActiveMedia(playlists) {
    const today = moment().format('YYYY-MM-DD');
    const report = [];

    playlists.forEach(playlist => {
        if (playlist.items) {
            playlist.items.forEach(item => {
                if (item.type === 'carousel') {
                    const activeMedia = item.items.filter(media => {
                        if (media.type === 'media' && media.contentSchedule) {
                            const startDate = media.contentSchedule.startDate || '1900-01-01';
                            const endDate = media.contentSchedule.endDate || '9999-12-31';
                            return today >= startDate && today <= endDate;
                        }
                        return false;
                    });

                    if (activeMedia.length > 0) {
                        report.push({
                            playlist: playlist.name,
                            carousel: item.name,
                            mediaIds: activeMedia.map(media => media.id)
                        });
                    }
                }
            });
        }
    });

    return report;
}

async function waitForReport(reportId) {
    console.log(`[INFO] Monitorando status do relatório ${reportId}...`);

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Aguarda 10s antes de checar novamente

        const fakeRes = {
            status: (code) => ({
                json: (data) => ({ statusCode: code, ...data })
            })
        };
        
        const statusResponse = await getReportStatus({ params: { reportId } }, fakeRes);

        if (!statusResponse.success) {
            console.error(`[ERROR] Erro ao verificar status do relatório ${reportId}.`);
            return null;
        }

        console.log(`[INFO] Status atual: ${statusResponse.status}`);

        if (statusResponse.status === "FINALIZADO") {
            const fakeRes = {
                status: (code) => ({
                    json: (data) => ({ statusCode: code, ...data })
                })
            };
        
            return await getReportResult({ params: { reportId } }, fakeRes);
        }
    }
}

async function processReportResult(reportResult, mediaToDetailsMap) {
    console.log("[INFO] Iniciando processamento dos resultados do relatório...");

    if (!reportResult || !reportResult.success) {
        console.error("[ERROR] Falha ao obter resultados do relatório.");
        console.log("[DEBUG] Detalhes do erro:", reportResult);
        return;
    }

    const { mediaDetails } = reportResult.data;

    if (!mediaDetails || typeof mediaDetails !== 'object') {
        console.error("[ERROR] Estrutura inesperada em `mediaDetails`.");
        console.log("[DEBUG] Conteúdo de `reportResult.data`:", reportResult.data);
        return;
    }

    const structuredData = {};

    for (const mediaId in mediaDetails) {
        const mediaData = mediaDetails[mediaId];
        const totalExhibitions = mediaData.totalExhibitions;

        if (!mediaToDetailsMap[mediaId]) continue;

        const { playlist, carrossel, media } = mediaToDetailsMap[mediaId];

        if (!structuredData[playlist]) {
            structuredData[playlist] = {};
        }

        if (!structuredData[playlist][carrossel]) {
            structuredData[playlist][carrossel] = {
                total: 0,
                medias: {},
            };
        }

        structuredData[playlist][carrossel].total += totalExhibitions;
        structuredData[playlist][carrossel].medias[media] = totalExhibitions;
    }

    // Filtrar apenas carrosséis com menos de 510 Inserções
    Object.keys(structuredData).forEach(playlist => {
        Object.keys(structuredData[playlist]).forEach(carrossel => {
            if (structuredData[playlist][carrossel].total >= 510) {
                delete structuredData[playlist][carrossel];
            }
        });

        // Remover playlists sem carrosséis
        if (Object.keys(structuredData[playlist]).length === 0) {
            delete structuredData[playlist];
        }
    });

    yesterdayFormatted = moment(yesterday).format('DD/MM/YYYY')
    if (Object.keys(structuredData).length === 0) {
        console.log(`[INFO] Nenhum carrossel ficou abaixo de 510 inserções em ${yesterdayFormatted}.`);
    
        // Criar um e-mail informando que está tudo certo
        let successHtml = `
        <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    color: #333;
                    margin: 20px;
                    padding: 20px;
                    background-color: #f4f4f4;
                }
                .container {
                    max-width: 800px;
                    background: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
                    text-align: center;
                }
                h2 {
                    color: #24d464;
                    margin-bottom: 20px;
                }
                p {
                    font-size: 16px;
                    line-height: 1.5;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Relatório de Mídias</h2>
                <p><strong>Data do relatório:</strong> ${yesterdayFormatted}</p>
                <p>✅ <strong>Todos os carrosséis tiveram pelo menos 510 inserções.</strong></p>
                <p>Não há mídias com baixo desempenho para reportar.</p>
            </div>
        </body>
        </html>
        `;
    
        // Enviar e-mail informando que não houve problemas
        await sendMailWarning(successHtml);
        return;
    }    

    // 📌 Gerar relatório em HTML
    let reportHtml = `
    <html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                color: #333;
                margin: 20px;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 800px;
                background: #ffffff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
            }
            h2 {
                color: #24d464;
                text-align: center;
                margin-bottom: 20px;
            }
            h3 {
                color: #24d464;
                margin-top: 20px;
                border-bottom: 2px solid #24d464;
                padding-bottom: 5px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #24d464;
                color: white;
            }
            .total {
                font-weight: bold;
                background-color: #e8f8ec;
            }
            .no-data {
                text-align: center;
                padding: 20px;
                font-size: 16px;
                color: #d9534f;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Relatório de Mídias Não Rodadas</h2>
            <p><strong>Data do relatório:</strong> ${yesterdayFormatted}</p>
    `;

    Object.keys(structuredData).forEach(playlist => {
        reportHtml += `<h3>Playlist: ${playlist}</h3>`;

        Object.keys(structuredData[playlist]).forEach(carrossel => {
            const total = structuredData[playlist][carrossel].total;
            reportHtml += `
                <table>
                    <thead>
                        <tr>
                            <th>Carrossel</th>
                            <th>Total de Inserções</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${carrossel}</td>
                            <td class="total">${total}</td>
                        </tr>
                    </tbody>
                </table>
                <table>
                    <thead>
                        <tr>
                            <th>Mídia</th>
                            <th>Inserções</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            Object.keys(structuredData[playlist][carrossel].medias).forEach(media => {
                const mediaViews = structuredData[playlist][carrossel].medias[media];
                reportHtml += `
                        <tr>
                            <td>${media}</td>
                            <td>${mediaViews}</td>
                        </tr>
                `;
            });

            reportHtml += `
                    </tbody>
                </table>
            `;
        });
    });

    reportHtml += `
            </div>
        </body>
        </html>
    `;

    await sendMailWarning(reportHtml);
}

// cron.schedule('0 2 * * *', async () => {
// // async function teste() {
//     console.log("[INFO] Executando cronJob para gerar e verificar relatório...");

//     try {
//         const reportData = await generateDailyReport();

//         if (reportData && reportData.reportId) {
//             console.log(`[INFO] Report ID gerado: ${reportData.reportId}. Iniciando monitoramento...`);
//             const reportResult = await waitForReport(reportData.reportId);

//             console.log("[INFO] Resultado do relatório recebido. Iniciando processamento...");
//             processReportResult(reportResult, reportData.mediaToDetailsMap);
//         } else {
//             console.log("[ERROR] Falha ao gerar relatório. Nenhum reportId retornado.");
//         }
//     } catch (error) {
//         console.error("[ERROR] Erro inesperado no cronJob:", error);
//     }
// }
// , {
//     scheduled: true,
//     timezone: "America/Sao_Paulo"
// });

// teste();

module.exports = { generateDailyReport, waitForReport, processReportResult };