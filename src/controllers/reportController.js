const  reportService = require("../services/reportService");
const analyticsService = require("../services/analyticsService");
const { generateScriptAnalytics } = require("../utils/analyticsChart");
const { listarPaineisService } = require("../services/paineisService")
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
        const data = await reportService.downloadAndProcessReport(reportUrl);

        const locations = Object.keys(data.playerDetails);
        const analyticsData = await analyticsService.fetchAnalyticsData(
            reportData.startDate,
            reportData.endDate,
            locations
        );
        const paineis = await listarPaineisService(locations);
        const analytiscScript = generateScriptAnalytics(analyticsData, paineis);

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
                    body { font-family: Arial, sans-serif;max-width: 1200px;margin: 20px auto;padding: 20px;background-color: #f4f4f4;color: #333;border-radius: 10px; }
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
                    .tabs {display: flex;border-bottom: 2px solid #ccc;margin-bottom: 20px;}
                    .tab-button {padding: 10px 20px;cursor: pointer;background: none;border: none;border-bottom: 3px solid transparent;font-weight: bold; font-size:larger;}
                    .tab-button.active {border-bottom: 3px solid #24d464;color: #24d464;}
                    .tab-content {display: none;}   .tab-content.active {display: block;}
                    :root {--audience-color: #35C759;--impact-color: #4887F3;--frequency-color: #8A5CF6;--dwell-time-color: #FFA500;--median-color: #cecece;--location-color: #DC3545;}
                    .dashboard-container {font-family: Arial, sans-serif;border: 1px solid #ddd;border-radius: 10px;color: white;}
                    #impact-result {margin-top: 15px;}
                    h2 i {color: black;}
                    section h2 {color: black;}#total {margin-bottom: 20px;padding: 20px;border-radius: 10px;background-color: #f9f9f9;}
                    .section-title {margin-bottom: 15px;gap: 10px;background: #ffffff;color: black;border-radius: 8px;padding: 15px;display: flex;align-items: center;box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);width: fit-content;}
                    .total-container.collapsed {max-height: 0;opacity: 0;padding: 0;margin: 0;}
                    .total-container {display: grid;grid-template-columns: repeat(3, 1fr);gap: 15px;margin-top: 10px;padding: 20px;overflow: hidden;transition: max-height 0.5s ease-out, opacity 0.5s ease-out;max-height: 1000px;opacity: 1;border-radius: 10px;}
                    .metric-card {background-color: #a1a1a178;border-radius: 8px;padding: 25px;display: flex;align-items: center;justify-content: space-between;box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);}
                    .metric-card:nth-child(1) .icon {color: var(--audience-color);}
                    .metric-card:nth-child(2) .icon {color: var(--impact-color);}
                    .metric-card:nth-child(3) .icon {color: var(--frequency-color);}
                    .metric-card:nth-child(4) .icon {color: var(--dwell-time-color);}
                    .metric-card:nth-child(5) .icon {color: var(--median-color);}
                    .metric-card:nth-child(6) .icon {color: var(--location-color);}
                    .chart-data-table::-webkit-scrollbar {width: 8px;height: 10px;}
                    .chart-data-table::-webkit-scrollbar-track {background: #ffffff;border-radius: 10px;}
                    .chart-data-table::-webkit-scrollbar-thumb {background: #35C759;border-radius: 10px;}
                    .chart-data-table::-webkit-scrollbar-thumb:hover {background: #2fa746;}
                    .icon {font-size: 26px;color: black;}
                    .info {text-align: right;}
                    .info span {display: block;    font-size: 12px;color: #777;}
                    .info h2 {    font-size: 24px;margin: 8px 0 0;font-weight: bold;/* color: #fff; */letter-spacing: 1px;}#address {padding: 20px;border-radius: 10px;background-color:#f9f9f9;}
                    #address h2 {margin-bottom: 15px;gap: 10px;background: #ffffff;color: black;border-radius: 8px;padding: 15px;display: flex;align-items: center;box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);width: fit-content;}
                    .address-container {overflow: hidden;transition: max-height 0.5s ease-out, opacity 0.5s ease-out;max-height: 1000px;opacity: 1;}
                    .address-scroll-wrapper {max-height: 800px;overflow-x: auto;}
                    .address-scroll-wrapper::-webkit-scrollbar {width: 8px;height: 8px;}.address-scroll-wrapper::-webkit-scrollbar-track {background: #ffffff;border-radius: 10px;}.address-scroll-wrapper::-webkit-scrollbar-thumb {background: #35C759;border-radius: 10px;}.address-scroll-wrapper::-webkit-scrollbar-thumb:hover {background: #2fa746;}
                    .address-container.collapsed {max-height: 0;opacity: 0;padding: 0;margin: 0;}
                    .address-table {width: 100%;border-collapse: collapse;background-color: #a1a1a178;border-radius: 8px;overflow: hidden;}
                    .address-table thead {background-color: #f0f0f0;color: #777;cursor: pointer;}
                    .address-table th,
                    .address-table td {padding: 12px;text-align: center;color: black;border-bottom: 1px solid #ffffff;}
                    .address-table th:nth-child(2) {color: var(--audience-color);}
                    .address-table th:nth-child(3) {color: var(--impact-color);}
                    .address-table th:nth-child(4) {color: var(--frequency-color);}
                    .address-table th:nth-child(5) {color: var(--dwell-time-color);}
                    .address-table th:nth-child(6) {color: var(--median-color);}
                    .address-table tbody tr:hover {background-color: #f0f0f0;}
                    .address-table th .sort-icon {margin-left: 5px;font-size: 12px;}
                    .toggle-button {color: white;background: none;border: none;cursor: pointer;}
                    @media (max-width: 768px) {
                    .address-table {font-size: 12px;}}
                    #avg {padding: 20px;border-radius: 10px;background-color:#f9f9f9;margin-top: 20px;}
                    #avg h2 {margin-bottom: 15px;gap: 10px;background: #ffffff;border-radius: 8px;padding: 15px;display: flex;align-items: center;box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);width: fit-content;}
                    .avg-container {padding: 10px;background-color: #ffffff;overflow: hidden;transition: max-height 0.5s ease-out, opacity 0.5s ease-out;opacity: 1;}
                    .avg-container.collapsed {max-height: 0;opacity: 0;padding: 0;margin: 0;}
                    #avg canvas {max-height: 350px;}
                    #audience-impact {padding: 20px;border-radius: 10px;background-color:#f9f9f9;margin-top: 20px;}
                    #audience-impact h2 {margin-bottom: 15px;gap: 10px;background: #ffffff;border-radius: 8px;padding: 15px;display: flex;align-items: center;box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);width: fit-content;}
                    .audience-impact-container {padding: 10px;background-color: #ffffff;overflow: hidden;transition: max-height 0.5s ease-out, opacity 0.5s ease-out;opacity: 1;}
                    .audience-impact-container.collapsed {max-height: 0;opacity: 0;padding: 0;margin: 0;}
                    .audience-impact-wrapper {display: flex;align-items: flex-start;width: 100%;gap: 10px;}
                    .chart-container {flex: 1.5;overflow-x: auto;height: 400px;}
                    #audience-impact canvas {width: 100% !important;height: 350px !important;}
                    .chart-scroll-container::-webkit-scrollbar {height: 8px;}.chart-scroll-container::-webkit-scrollbar-track {background: #ffffff;border-radius: 10px;}.chart-scroll-container::-webkit-scrollbar-thumb {background: #35C759; border-radius: 10px;}.chart-scroll-container::-webkit-scrollbar-thumb:hover {background: #2fa746;}
                    .audience-table thead, .audience-table-weekly thead {cursor: pointer;}
                    .audience-table th:nth-child(2), .audience-table-weekly th:nth-child(2) {color: var(--audience-color);}
                    .audience-table th:nth-child(3), .audience-table-weekly th:nth-child(3) {color: var(--impact-color);}
                    .audience-table th:nth-child(4), .audience-table-weekly th:nth-child(4) {color: var(--dwell-time-color);}
                    .chart-data-table {background-color: #a1a1a178;padding: 10px;border-radius: 8px;max-height: 400px;overflow-y: auto;margin-left: 20px;flex: 1;font-size: 14px;}
                    .chart-data-table table {width: 100%;border-collapse: collapse;color: white;}
                    .chart-data-table th, .chart-data-table td {padding: 8px;text-align: center;border-bottom: 1px solid #ffffff;color: black;}
                    .chart-data-table thead {background-color: #f0f0f0;color: #777;}
                    .chart-data-table tbody {background-color: #9ca3af0a;}
                    #recurrence {padding: 20px;border-radius: 10px;background-color:#f9f9f9;margin-top: 20px;}
                    #recurrence h2 {margin-bottom: 15px;gap: 10px;background: #ffffff;border-radius: 8px;padding: 15px;display: flex;align-items: center;box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);width: fit-content;}
                    .recurrence-container {padding: 25px;background-color: #ffffff;overflow: hidden;transition: max-height 0.5s ease-out, opacity 0.5s ease-out;opacity: 1;}
                    .recurrence-container.collapsed {max-height: 0;opacity: 0;padding: 0;margin: 0;}
                    .chart-recurrence-container {flex: 1.5;overflow-x: auto;height: 550px;border-radius: 10px;}
                    .recurrence-table {border-collapse: collapse;background-color: #a1a1a178;border-radius: 8px;overflow: hidden;font-size: 18px;}
                    .recurrence-table th, .recurrence-table td {padding: 8px;text-align: center;border-bottom: 1px solid #ffffff;color: black;}
                    .recurrence-table thead {background-color: #f0f0f0;color: #777;cursor: pointer;}
                    #cameras {padding: 20px;border-radius: 10px;background-color:#f9f9f9;margin-top: 20px;}
                    #cameras h2 {margin-bottom: 15px;gap: 10px;background: #ffffff;border-radius: 8px;padding: 15px;display: flex;align-items: center;box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);width: fit-content;}
                    .cameras-container {padding: 10px;background-color: #ffffff;overflow: hidden;transition: max-height 0.5s ease-out, opacity 0.5s ease-out;opacity: 1;}
                    .cameras-container.collapsed {max-height: 0;opacity: 0;padding: 0;margin: 0;}
                    .cameras-table {width: 100%;border-collapse: collapse;/* background-color: #a1a1a178; */border-radius: 8px;overflow: hidden;}
                    .cameras-table thead {cursor: pointer;}
                    .cameras-table th, .cameras-table td {padding: 8px;text-align: center;border-bottom: 1px solid #ffffff;}
                    .pagination-controls {display: flex;justify-content: space-between;margin-top: 10px;color: black;}
                    .chart-cameras-container {flex: 1.5;overflow-x: auto;height: 400px;white-space: nowrap;}
                    .chart-body-cameras canvas {width: 100% !important;height: 380px !important;}  
                    .audience-impact-container h3 {color: black;} .avg-container h3 {color: black;}
                </style>
            </head>
            <body>
                <div class="header-container">
                    <img src="../../assets/fotos/fotoHeader.png" 
                    alt="Logo Sobremidia" 
                    class="header-image">
                </div>

                <div class="tabs">
                    <button
                        class="tab-button active"
                        onclick="showTab('tab-veiculacao', this)"
                    >
                        Veiculação
                    </button>
                    <button class="tab-button" onclick="showTab('tab-impacto', this)">
                        Métricas
                    </button>
                </div>

                <div id="tab-veiculacao" class="tab-content active">
                    <h1>Relatório de Veiculação</h1>
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
                </div>

                <div id="tab-impacto" class="tab-content">
                    ${generateImpactHTML()}
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

                    function showTab(tabId, btn) {
                        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                        document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));

                        document.getElementById(tabId).classList.add('active');
                        btn.classList.add('active');
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

                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-zoom/2.2.0/chartjs-plugin-zoom.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js"></script>
           
                <script>
                    ${analytiscScript}
                </script>
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

function generateImpactHTML() {
    return `
        <h1 style="margin-top: 10px;">Relatório de Métricas</h3>
        <div
            id="impact-no-data"
            style="
                display: none;
                padding: 2rem;
                font-size: 1.5rem;
                color: black;
            "
        >
            Sem dados
        </div>
        <div id="impact-result">
            <div class="dashboard-container">
                <!-- Section: Total -->
                <section class="section" id="total">
                    <h2 class="section-title">
                        <i class="fas fa-chart-bar"></i>
                        Dados Totais
                        <button
                            class="toggle-button"
                            onclick="toggleSection('total')"
                        >
                            <i class="fas fa-chevron-up"></i>
                        </button>
                    </h2>
                    <div
                        class="total-container"
                        id="total-container"
                    >
                        <div class="metric-card">
                            <i class="fas fa-users icon"></i>
                            <div class="info">
                                <span>Audiência Total</span>
                                <h2 id="totalAudience"></h2>
                            </div>
                        </div>
                        <div class="metric-card">
                            <i
                                class="fas fa-chart-bar icon"
                            ></i>
                            <div class="info">
                                <span>Impacto</span>
                                <h2 id="totalImpact"></h2>
                            </div>
                        </div>
                        <div class="metric-card">
                            <i class="fas fa-sync-alt icon"></i>
                            <div class="info">
                                <span>Frequência Média</span>
                                <h2 id="frequency"></h2>
                            </div>
                        </div>
                        <div class="metric-card">
                            <i class="fas fa-clock icon"></i>
                            <div class="info">
                                <span>Dwell Time</span>
                                <h2 id="dwellTime"></h2>
                            </div>
                        </div>
                        <div class="metric-card">
                            <i
                                class="fas fa-calendar-alt icon"
                                style="color: #ffffff"
                                ></i>
                            <div class="info">
                                <span
                                    >Mediana de Dias
                                    Monitorados</span
                                >
                                <h2 id="medianDays"></h2>
                            </div>
                        </div>
                        <div class="metric-card">
                            <i
                                class="fas fa-map-marker-alt icon"
                            ></i>
                            <div class="info">
                                <span>Localizações</span>
                                <h2 id="locations"></h2>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Section: Endereços -->
                <section class="section" id="address">
                    <h2>
                        <i class="fas fa-map-marker-alt"></i>
                        Endereços
                        <button
                            class="toggle-button"
                            onclick="toggleSection('address')"
                        >
                            <i class="fas fa-chevron-up"></i>
                        </button>
                    </h2>
                    <div class="address-container">
                        <div class="address-scroll-wrapper">
                            <table
                                id="addressesTable"
                                class="address-table"
                            >
                                <thead>
                                    <tr>
                                        <th data-column="local">
                                            Local
                                            <span
                                                class="sort-icon"
                                            ></span>
                                        </th>
                                        <th
                                            data-column="audiencia"
                                        >
                                            Audiência
                                            <span
                                                class="sort-icon"
                                            ></span>
                                        </th>
                                        <th
                                            data-column="impacto"
                                        >
                                            Impactos
                                            <span
                                                class="sort-icon"
                                            ></span>
                                        </th>
                                        <th
                                            data-column="frequencia"
                                        >
                                            Frequência média
                                            <span
                                                class="sort-icon"
                                            ></span>
                                        </th>
                                        <th
                                            data-column="dwellTime"
                                        >
                                            Dwell Time
                                            <span
                                                class="sort-icon"
                                            ></span>
                                        </th>
                                        <th
                                            data-column="medianDays"
                                        >
                                            Mediana de dias
                                            monitorados
                                            <span
                                                class="sort-icon"
                                            ></span>
                                        </th>
                                        <th
                                            data-column="minDate"
                                        >
                                            Data mínima
                                            <span
                                                class="sort-icon"
                                            ></span>
                                        </th>
                                        <th
                                            data-column="maxDate"
                                        >
                                            Data máxima
                                            <span
                                                class="sort-icon"
                                            ></span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="addressesList">
                                    <!-- Endereços serão adicionados dinamicamente pelo JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- Section: Audience x Impact -->
                <section class="section" id="audience-impact">
                    <h2>
                        <i class="fas fa-chart-line"></i> Total
                        por dia e semana
                        <button
                            class="toggle-button"
                            onclick="toggleSection('audience-impact')"
                        >
                            <i class="fas fa-chevron-up"></i>
                        </button>
                    </h2>
                    <div class="audience-impact-container">
                        <h3>
                            Análise Diária Audiência x Impactos
                        </h3>
                        <div class="audience-impact-wrapper">
                            <div
                                class="chart-container chart-scroll-container"
                            >
                                <div class="chart-body">
                                    <canvas
                                        id="dailyChart"
                                    ></canvas>
                                </div>
                            </div>
                            <div class="chart-data-table">
                                <table
                                    id="audienceTable"
                                    class="audience-table"
                                >
                                    <thead>
                                        <tr>
                                            <th
                                                data-column="date"
                                            >
                                                Data
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                            <th
                                                data-column="audience"
                                            >
                                                Audiência
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                            <th
                                                data-column="impact"
                                            >
                                                Impacto
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                            <th
                                                data-column="dwell_time"
                                            >
                                                Dwell Time
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        id="dailyDataTable"
                                    ></tbody>
                                </table>
                            </div>
                        </div>

                        <h3>
                            Análise Semanal Audiência x Impactos
                        </h3>
                        <div class="audience-impact-wrapper">
                            <div
                                class="chart-container chart-scroll-container"
                            >
                                <div class="chart-body">
                                    <canvas
                                        id="weeklyChart"
                                    ></canvas>
                                </div>
                            </div>
                            <div class="chart-data-table">
                                <table
                                    id="audienceTable-weekly"
                                    class="audience-table-weekly"
                                >
                                    <thead>
                                        <tr>
                                            <th
                                                data-column="day"
                                            >
                                                Dia da Semana
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                            <th
                                                data-column="audience"
                                            >
                                                Audiência
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                            <th
                                                data-column="impact"
                                            >
                                                Impacto
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                            <th
                                                data-column="dwell_time"
                                            >
                                                Dwell Time
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        id="weeklyDataTable"
                                    ></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Section: Média por Hora e Turno -->
                <section class="section" id="avg">
                    <h2>
                        <i class="fas fa-clock"></i> Média por
                        Hora e Turno
                        <button
                            class="toggle-button"
                            onclick="toggleSection('avg')"
                        >
                            <i class="fas fa-chevron-up"></i>
                        </button>
                    </h2>
                    <div class="avg-container">
                        <h3>Média de Impactos por Hora</h3>
                        <canvas id="hourlyChart"></canvas>

                        <h3>Média de Impactos por Turno</h3>
                        <canvas id="shiftChart"></canvas>
                    </div>
                </section>

                <!-- Section: Recorrência -->
                <section class="section" id="recurrence">
                    <h2>
                        <i class="fas fa-id-badge"></i>
                        Recorrência
                        <button
                            class="toggle-button"
                            onclick="toggleSection('recurrence')"
                        >
                            <i class="fas fa-chevron-up"></i>
                        </button>
                    </h2>
                    <div class="recurrence-container">
                        <div class="audience-impact-wrapper">
                            <div
                                class="chart-recurrence-container"
                            >
                                <canvas
                                    id="recurrenceChart"
                                ></canvas>
                            </div>
                            <div
                                class="chart-recurrence-data-table"
                            >
                                <table
                                    id="recurrenceTable"
                                    class="recurrence-table"
                                >
                                    <thead>
                                        <tr>
                                            <th
                                                data-column="recurrence"
                                            >
                                                Recorrência
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                            <th
                                                data-column="value"
                                            >
                                                Valor
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                            <th
                                                data-column="percentage"
                                            >
                                                Porcentagem
                                                <span
                                                    class="sort-icon"
                                                ></span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        id="recurrenceDataTable"
                                    ></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Section: Câmeras -->
                <section class="section" id="cameras">
                    <h2>
                        <i class="fas fa-video"></i> Câmeras
                        <button
                            class="toggle-button"
                            onclick="toggleSection('cameras')"
                        >
                            <i class="fas fa-chevron-up"></i>
                        </button>
                    </h2>
                    <div
                        class="cameras-container"
                        id="cameras-container"
                    >
                        <div
                            id="cameras-no-data"
                            style="
                                display: none;
                                padding: 1rem 0;
                                text-align: center;
                            "
                        >
                            <p
                                style="
                                    font-size: 1.5rem;
                                    color: black;
                                "
                            >
                                Sem dados
                            </p>
                        </div>

                        <div id="cameras-content">
                            <h3>Média de Impactos por Data</h3>
                            <div
                                class="chart-cameras-container chart-scroll-container"
                            >
                                <div class="chart-body-cameras">
                                    <canvas
                                        id="camerasChart"
                                    ></canvas>
                                </div>
                            </div>
                            <div class="chart-data-table">
                                <table
                                    id="camerasTable"
                                    class="cameras-table"
                                >
                                    <thead>
                                        <tr>
                                            <th
                                                data-column="name"
                                            >
                                                Localização
                                            </th>
                                            <th
                                                data-column="cars"
                                            >
                                                Carros
                                            </th>
                                            <th
                                                data-column="buses"
                                            >
                                                Ônibus
                                            </th>
                                            <th
                                                data-column="trucks"
                                            >
                                                Caminhões
                                            </th>
                                            <th
                                                data-column="vans"
                                            >
                                                Vans
                                            </th>
                                            <th
                                                data-column="motorcycles"
                                            >
                                                Motos
                                            </th>
                                            <th
                                                data-column="people"
                                            >
                                                Pessoas
                                            </th>
                                            <th
                                                data-column="impact_total"
                                            >
                                                Impacto
                                            </th>
                                            <th
                                                data-column="id"
                                            >
                                                ID
                                            </th>
                                            <th
                                                data-column="date"
                                            >
                                                Data(s)
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        id="camerasDataTable"
                                    ></tbody>
                                </table>
                                <div
                                    class="pagination-controls"
                                >
                                    <button id="prevPage">
                                        &#9664;
                                    </button>
                                    <span id="pageInfo"
                                        >Página 1 de X</span
                                    >
                                    <button id="nextPage">
                                        &#9654;
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div id="modal-detalhes"></div>
                    </div>
                </section>
            </div>
        </div>
    `
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

exports.handleProtectedHtmlGet = async(req, res) => {
    if (req.session.isAuthenticated) {
        return displayReport(req, res);
    }
  
    const loginPage = `
        <html lang="pt-br">
        <head>
            <title>Relatório Protegido</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f4f4f4; }
                .container { max-width: 400px; margin: auto; padding: 20px; background: white; border-radius: 5px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1); }
                input { display: block; width: 100%; margin-bottom: 10px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 5px; }
                button { padding: 10px; width: 100%; background: #24d464; border: none; color: white; font-size: 16px; cursor: pointer; border-radius: 5px; }
                button:hover { background: #1db354; }
                .error { color: red; font-size: 14px; margin-top: 10px; display: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Digite a Senha para Acessar o Relatório</h2>
                <form id="passwordForm">
                    <input type="password" id="passwordInput" placeholder="Digite a senha" required>
                    <button type="submit">Entrar</button>
                    <p class="error" id="errorMessage">Senha incorreta!</p>
                </form>
            </div>

            <script>
                document.getElementById("passwordForm").addEventListener("submit", async function(event) {
                    event.preventDefault();
                    var password = document.getElementById("passwordInput").value;
                    
                    const response = await fetch(window.location.pathname, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ password })
                    });

                    if (response.ok) {
                        window.location.reload();
                    } else {
                        document.getElementById("errorMessage").style.display = "block";
                    }
                });
            </script>
        </body>
        </html>
    `;
    res.send(loginPage);
}
  
exports.handleProtectedHtmlPost = async(req, res) => {
    const { reportId } = req.params;
    const { password } = req.body;
  
    try {
        const reportRef = db.collection("relatorios").doc(reportId);
        const reportData = await reportRef.get();
  
        if (!reportData.exists) {
            return res.status(404).send("Relatório não encontrado.");
        }
  
        const storedPassword = reportData.data().senha;
  
        if (password === storedPassword) {
            req.session.isAuthenticated = true;
            return res.status(200).send("OK");
        }
  
        res.status(401).send("Senha incorreta.");
    } catch (error) {
        console.error("[ERROR] Erro na autenticação:", error);
        res.status(500).send("Erro no servidor.");
    }
}

exports.organizeReportFromUrl = async(req, res) => {
    const { url } = req.query;
  
    if (!url) {
        console.error("[ERROR] URL do relatório não fornecida.");
        return res.status(400).json({ success: false, error: "A URL do relatório é obrigatória." });
    }
  
    try {
        console.log(`[INFO] Processando relatório a partir da URL: ${url}`);
        const data = await reportService.organizeReport(url);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error(`[ERROR] Erro ao processar relatório ${url}:`, error.message);
        return res.status(500).json({ success: false, error: error.message || "Erro interno ao processar o relatório." });
    }
  }