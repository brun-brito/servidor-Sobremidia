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
                    body { font-family: Arial, sans-serif;max-width: 900px;margin: 20px auto;padding: 20px;background-color: #f4f4f4;color: #333;border-radius: 10px; }
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
                    .modal {position: fixed;z-index: 1000;left: 0;top: 0;width: 100%;height: 100%;background-color: rgba(0, 0, 0, 0.6);display: flex;justify-content: center;align-items: center;padding: 20px;}
                    .modal-content {background-color: white;padding: 20px;border-radius: 8px;box-shadow: 0px 6px 15px rgba(0, 0, 0, 0.4);width: 90%;max-width: 600px;max-height: 80vh;overflow-y: auto;text-align: center;}
                    .modal-content ul {list-style: none;padding: 0;margin: 0;font-size: 14px;text-align: left;max-height: 60vh;overflow-y: auto;}
                    .modal-content ul li {padding: 8px;border-bottom: 1px solid #ddd;}
                    .modal-content a {color: #007bff;text-decoration: none;cursor: pointer;font-weight: bold;}
                    .modal-content a:hover {text-decoration: underline;}
                    .grid-container {display: grid;grid-template-columns: repeat(3, 1fr);gap: 10px;padding: 10px;max-height: 60vh;overflow-y: auto;}
                    #detailed-aparicoes-list {grid-template-columns: 1fr 1fr 1fr 1fr;}
                    .grid-item {background: #f4f4f4;padding: 8px;border-radius: 4px;text-align: center;}
                    .modal-content button {background-color:rgba(255, 0, 0, 0.72);color: white;border: none;padding: 10px 20px;border-radius: 5px;cursor: pointer;font-size: 14px;margin-top: 10px;}
                    .modal-content button:hover {background-color:rgb(179, 0, 0);}
                    @keyframes fadeIn {from {opacity: 0;transform: scale(0.9);}to {opacity: 1;transform: scale(1);}}
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

                <div style="display: none;" id="totalAparicoesModal" class="modal">
                    <div class="modal-content">
                        <h2>Detalhes de Inserções</h2>
                        <ul id="daily-aparicoes-list"></ul>
                        <button onclick="document.getElementById('totalAparicoesModal').style.display='none'">Fechar</button>
                    </div>
                </div>

                <div style="display: none;" id="dailyAparicoesModal" class="modal">
                    <div class="modal-content">
                        <h2>Horários das Inserções</h2>
                        <ul id="detailed-aparicoes-list"></ul>
                        <button onclick="document.getElementById('dailyAparicoesModal').style.display='none'">Fechar</button>
                    </div>
                </div>

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

                    document.addEventListener("DOMContentLoaded", function () {
                        document.body.addEventListener("click", function (event) {
                            if (event.target.closest(".view-total-link")) {
                                event.preventDefault();

                                const link = event.target.closest(".view-total-link");
                                const playerId = link.getAttribute("data-player-id");
                                const mediaId = link.getAttribute("data-media-id");
                                const logsRaw = link.getAttribute("data-logs");


                                let logs;
                                try {
                                    logs = JSON.parse(logsRaw);
                                } catch (error) {
                                    console.error("Erro ao fazer parse dos logs:", error);
                                    return;
                                }

                                const modal = document.getElementById("totalAparicoesModal");
                                const modalContent = modal.querySelector(".modal-content ul");
                                modalContent.innerHTML = "";

                                const sortedDates = Object.entries(logs).sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB));

                                sortedDates.forEach(([date, times]) => {
                                    const totalInsercoes = times.length;
                                    const formattedDate = moment(date).format("DD/MM/YYYY");

                                    const listItem = document.createElement("li");
                                    listItem.innerHTML = \`
                                        <strong>\${formattedDate}:</strong> 
                                        <a href="#" class="daily-insercoes-link" 
                                            data-date="\${date}" 
                                            data-times='\${JSON.stringify(times)}'>
                                            \${totalInsercoes} inserções
                                        </a>
                                    \`;
                                    modalContent.appendChild(listItem);
                                });

                                modal.style.display = "flex";
                            }

                            if (event.target.closest(".daily-insercoes-link")) {
                                event.preventDefault();

                                const link = event.target.closest(".daily-insercoes-link");
                                const date = link.getAttribute("data-date");
                                const times = JSON.parse(link.getAttribute("data-times"));
                                const sortedTimes = times.sort();

                                const detailedModal = document.getElementById("dailyAparicoesModal");
                                const detailedContent = detailedModal.querySelector(".modal-content ul");
                                detailedContent.innerHTML = "";

                                sortedTimes.forEach((time, index) => {
                                    const gridItem = document.createElement("div");
                                    gridItem.classList.add("grid-item");
                                    gridItem.innerHTML = \`
                                        <strong>\${index + 1} -</strong> \${time}
                                    \`;
                                    detailedContent.appendChild(gridItem);
                                });

                                detailedModal.style.display = "flex"; // Exibe o modal secundário
                            }

                            if (event.target.id === "totalAparicoesModal" || event.target.id === "dailyAparicoesModal") {
                                event.target.style.display = "none";
                            }
                        });
                    });
                </script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js"></script>
            </body>
            </html>
        `;

        res.setHeader("Content-Type", "text/html");
        res.send(reportHTML);
    } catch (error) {
        console.error("[ERROR] Erro ao exibir relatório:", error);
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