const { loginAndExtractToken } = require('../services/tokenService');
const  reportService = require("../services/reportService");
const axios = require('axios');
const API_URL = 'https://analytics.4yousee.com/django/legacy/api/concurrent_dash_data/308/';
const { db } = require("../config/firebase");
const https = require("https");

exports.fetchAnalyticsData = async (startDate, endDate, input) => {
  let locations = [];

  if (Array.isArray(input)) {
    locations = input;
  } else { // se mandar so o reportId
    const dataVeiculacao = await getReport(input);
    locations = dataVeiculacao?.locations || [];
  }

  const resolvedLocations = await resolveLocations(locations);

  const payload = {
    locations_filter: resolvedLocations,
    duration: {
      "1_min": true,
      "1_3_min": true,
      "3_30_min": true,
      "30_min": true
    },
    start_date: startDate,
    end_date: endDate
  };

  try {
    const token = await loginAndExtractToken();
    const response = await axios.post(API_URL, payload, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new https.Agent({keepAlive: true}),
    });

    console.log("📊 [fetchAnalyticsData] Dados recebidos com sucesso");
    
    return response.data;
  } catch (error) {
    console.error("[ERROR] Erro ao buscar dados de analytics:", error.message);
    return null;
  }
};

async function resolveLocations(locations) {
  console.log("📌 [resolveLocations] IDs recebidos:", locations);

  try {
    const snapshot = await db
      .collection("paineis")
      .get();

    const paineis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (locations.length === 0) {
      console.log("📤 [resolveLocations] Retornando todos os locais");
      const allLocals = paineis
      .map(p => p.local)
      .filter(local => local && local.trim() !== '');
      return allLocals;
    } else {
      const matchedLocals = locations
        .map(id => {
          const painel = paineis.find(p => p.idManager == id);
          if (!painel) {
            console.warn(`⚠️ Painel com ID '${id}' não encontrado.`);
            return null;
          }
          return painel.local;
        })
        .filter(Boolean);

      console.log("📤 [resolveLocations] Locais correspondentes:", matchedLocals);
      return matchedLocals;
    }
  } catch (error) {
    console.error("❌ [resolveLocations] Erro ao buscar paineis:", error.message);
    return [];
  }
}

async function getReport(reportId) {
  try {
    const reportRef = db.collection("relatorios").doc(reportId);
    const reportApi = await reportRef.get();

    if (!reportApi.exists) {
      console.error(`[ERROR] Relatório ${reportId} não encontrado no Firestore.`);
      return null;
    }

    const reportData = reportApi.data();
    const reportUrl = reportData.url;
    const parsed = await reportService.downloadAndProcessReport(reportUrl);
    
    if (!parsed?.playerDetails) {
      console.error(`[ERROR] Relatório ${reportId} não contém playerDetails.`);
      return null;
    }

    const locations = Object.keys(parsed.playerDetails);

    return { locations };
  } catch (error) {
    console.error(`[ERROR] Erro ao buscar relatório ${reportId}:`, error.message);
    return null;
  }
}