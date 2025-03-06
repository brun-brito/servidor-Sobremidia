const { downloadAndProcessReport } = require("../services/reportService");
const { db } = require("../config/firebase");
const { BASE_URL, SECRET_TOKEN1, SECRET_TOKEN2 } = require("../config");
const moment = require('moment');   

async function displayReport(req, res) {
    try {
        const reportId = req.params.reportId;
        const reportRef = db.collection("relatorios").doc(reportId);
        const reportApi = await reportRef.get();

        if (!reportApi.exists) {
            console.error(`[ERROR] Relatório ${reportId} não encontrado no Firestore.`);
            return res.status(404).send("Relatório não encontrado.");
        }

        const reportData = reportApi.data();
        const reportUrl = reportData.url;
        const data = await downloadAndProcessReport(reportUrl);

        if (!data) {
            return res.status(404).send("Erro ao processar relatório.");
        }

        const { mediaDetails = {}, playerDetails = {}, summary = {} } = data;

        const BASE_THUMBNAIL_URL = "https://s3.amazonaws.com/4yousee-files/sobremidia/common/videos/thumbnails/i_";

        const mediaIds = Object.keys(mediaDetails);
        const panelIds = Object.keys(playerDetails);

        const mediaNames = await fetchMediaNames(mediaIds);
        const panelNames = await fetchPanelNames(panelIds);

        const mediaHTML = Object.entries(mediaDetails).map(([mediaId, mediaData]) => {
            const { totalExhibitions, players } = mediaData;
            let mediaName = mediaNames[mediaId] || `Mídia ${mediaId}`;
        
            if (mediaName.includes("-")) {
                mediaName = mediaName.split("-").slice(1).join("-");
            }
        
            return `
                <li class="media-item">
                    <div class="media-summary">
                        <img src="${BASE_THUMBNAIL_URL}${mediaId}.png" alt="${mediaName}" class="media-thumbnail">
                        <div class="media-info">
                        <strong>Nome: </strong><p id="media-name-${mediaId}">${mediaName}</p>
                        <p><strong>Total de Inserções:</strong> ${totalExhibitions}</p>
                        <button class="details-button" onclick="toggleDetails('details-media-${mediaId}', this)">
                            Ver detalhes <i class="fas fa-chevron-right"></i>
                        </button>
                        </div>
                    </div>
                    <div class="media-details details" id="details-media-${mediaId}" style="display: none;">
                        ${Object.entries(players).map(([playerId, logs]) => {
                            const logsByDate = groupLogsByDate(logs);
                            const totalAparicoes = logs.length;
        
                            return `
                                <div class="panel-details">
                                    <p><h3>${panelNames[playerId] || `Painel ${playerId}`}:</h3></p>
                                    <ul>
                                        <li>
                                            <span>Total:</span> 
                                            <a href="#" class="view-total-link"
                                              data-player-id="${playerId}" 
                                              data-media-id="${mediaId}" 
                                              data-logs='${JSON.stringify(logsByDate)}'>
                                                ${totalAparicoes} inserções
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                <div id="totalMediaAparicoesModal-${playerId}-${mediaId}" class="modal">
                                    <div class="modal-content">
                                        <ul id="daily-aparicoes-list-${playerId}-${mediaId}"></ul>
                                    </div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </li>
            `;
        }).join("");             

        const panelHTML = Object.entries(playerDetails || {}).map(([playerId, playerData]) => {
            if (!playerData || typeof playerData !== 'object') {
                console.error(`[ERROR] playerData inválido para playerId: ${playerId}`, playerData);
                return "";
            }

            const { totalExhibitions, media } = playerData;
            const panelName = panelNames[playerId] || `Painel ${playerId}`;

            return `
                <li class="panel-item">
                    <div class="panel-summary">
                        <div class="panel-info">
                            <div class="panel-icon">
                                <i class="fas fa-tv"></i> <!-- Ícone de player -->
                            </div>
                            <strong>Nome: </strong><p id="panel-name-${playerId}">${panelName}</p>
                            <p><strong>Total de Inserções:</strong> ${totalExhibitions}</p>
                            <button class="details-button" onclick="toggleDetails('details-panel-${playerId}', this)">
                                Ver detalhes <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                    <div class="panel-details details" id="details-panel-${playerId}" style="display: none;">
                        ${Object.entries(media).map(([mediaId, logs]) => {
                            const logsByDate = groupLogsByDate(logs);
                            const totalAparicoes = logs.length;

                            return `
                                <div class="media-details">
                                    <p><strong>${mediaNames[mediaId]
                                        ? (mediaNames[mediaId].includes("-")
                                            ? mediaNames[mediaId].split("-").slice(1).join("-")
                                            : mediaNames[mediaId])
                                        : `Mídia ${mediaId}`
                                    }:</strong></p>
                                    <ul>
                                        <li>
                                            <strong>Total:</strong> 
                                            <a href="#" class="view-total-link"
                                                data-player-id="${playerId}" 
                                                data-media-id="${mediaId}" 
                                                data-logs='${JSON.stringify(logsByDate)}'>
                                                ${totalAparicoes} inserções
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                <div id="totalPanelAparicoesModal-${playerId}-${mediaId}" class="modal">
                                    <div class="modal-content">
                                        <ul id="daily-aparicoes-list-${playerId}-${mediaId}"></ul>
                                    </div>
                                </div>
                            `;
                        }).join("")}
                        </div>
                    </li>
                `;
            }).join("");

        const reportHTML = `
            <html lang="pt-br">
            <head>        
                <link rel="icon" href="../../assets/fotos/color.png" type="image/x-icon">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Relatório ${reportId}</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }
                    h1, h2 { color: #333; } .report-summary { background: white; display: inline-block;padding: 15px;border-radius: 5px;box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);max-width: 600px;text-align: left;}
                    ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
                    li { background: white; margin: 10px 0; padding: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); }
                    .media-thumbnail { width: 100px; height: auto; margin-right: 10px; }
                    .media-summary, .panel-summary { display: flex; align-items: center; }
                    .media-info, .panel-info { flex: 1; } .panel-icon { font-size: 30px; color: #24d464; margin-bottom: 10px; } 
                    .panel-item input { margin-right: 10px; } .panel-summary { gap: 14px; } 
                    .details-button { background-color: transparent; color: #007bff; border: none; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; }
                    .details-button i { transition: transform 0.3s; } .details-button.open i { transform: rotate(90deg); }
                    .header-container {height: clamp(90px, 12vw, 150px);background: #ffffff;border-bottom: 3px solid #24d464;overflow: hidden;}
                    .header-image {height: clamp(123%, 80vw, 90%);width: clamp(60%, 70vw, 90%);object-fit: cover;position: relative;left: clamp(-80px, -5vw, 0px);}
                    @media(min-width: 768px) {.header-container {padding-bottom: 5px;} }
                    .footer-container {height: clamp(90px, 12vw, 150px);overflow: hidden;display: flex;justify-content: center;align-items: center;}
                    .footer-image {height: 100%;width: clamp(100%, 80vw, 100%);object-fit: cover;position: relative;}
                </style>
            </head>
            <body>
                <div class="header-container">
                    <img src="../../assets/fotos/fotoHeader.png" 
                    alt="Logo Sobremidia" 
                    class="header-image">
                </div>
                <h1>Relatório de Inserções</h1>
                <div class="report-summary">
                    <p><strong>Intervalo de Datas:</strong> ${moment(reportData.startDate).format("DD/MM/YYYY")} (${reportData.startTime || '00:00'}) - ${moment(reportData.endDate).format("DD/MM/YYYY")} (${reportData.endTime || '23:59'})</p>
                    <p><strong>Cliente(s):</strong> ${Array.isArray(reportData.clientes) ? reportData.clientes.join(", ") : reportData.clientes || "Todos"}</p>
                    <p><strong>Total de Inserções:</strong> ${summary.totalExhibitions || 0}</p>
                    <p><strong>Total de Mídias Inseridas:</strong> ${summary.totalMedia || 0}</p>
                    <p><strong>Total de Painéis Utilizados:</strong> ${summary.totalPlayers || 0}</p>
                </div>

                <h2>Inserções por Mídia</h2>
                <ul>${mediaHTML || "<p>Nenhuma mídia registrada.</p>"}</ul>
                
                <h2>Inserções por Painel</h2>
                <ul>${panelHTML || "<p>Nenhum painel registrado.</p>"}</ul>

                <div class="footer-container">
                    <img src="../../assets/fotos/fotoFooter.png" 
                    alt="Rodapé Sobremidia" 
                    class="footer-image">
                </div>

                <script>
                    function toggleDetails(id, button) {
                        var detailsDiv = document.getElementById(id);

                        if (detailsDiv.style.display === "none" || detailsDiv.style.display === "") {
                            detailsDiv.style.display = "block";
                            button.classList.add("open");
                            button.innerHTML = 'Recolher detalhes <i class="fas fa-chevron-right"></i>';
                        } else {
                            detailsDiv.style.display = "none";
                            button.classList.remove("open");
                            button.innerHTML = 'Ver detalhes <i class="fas fa-chevron-right"></i>';
                        }
                    }
                </script>
            </body>
            </html>
        `;

        res.setHeader("Content-Type", "text/html");
        res.send(reportHTML);
    } catch (error) {
        console.error("[ERROR] Erro ao exibir relatório:", error.message);
        res.status(500).send("Erro ao exibir relatório.");
    }
}

async function fetchMediaNames(mediaIds) {
    try {
        const response = await fetch(`${BASE_URL}/v1/medias?id=${mediaIds.join(',')}`,
        {headers: { 'Secret-Token': SECRET_TOKEN1 }});
        if (!response.ok) throw new Error("Erro ao buscar nomes das mídias.");
        const data = await response.json();

        const mediaNames = {};
        data.results.forEach(media => {
            mediaNames[media.id] = media.name;
        });

        return mediaNames;
    } catch (error) {
        console.error("[ERROR] Falha ao buscar nomes das mídias:", error);
        return {};
    }
}

async function fetchPanelNames(panelIds) {
    try {
        const response = await fetch(`${BASE_URL}/v1/players`, 
        {headers: { 'Secret-Token': SECRET_TOKEN2 }});
        if (!response.ok) throw new Error("Erro ao buscar nomes dos painéis.");
        const data = await response.json();

        const panelNames = {};
        data.results.forEach(panel => {
            if (panelIds.includes(String(panel.id))) {
                panelNames[panel.id] = panel.name;
            }
        });

        return panelNames;
    } catch (error) {
        console.error("[ERROR] Falha ao buscar nomes dos painéis:", error);
        return {};
    }
}

function groupLogsByDate(logs) {
    return logs.reduce((acc, log) => {
        if (!acc[log.date]) acc[log.date] = [];
        acc[log.date].push(log.time);
        return acc;
    }, {});
}

module.exports = { displayReport };