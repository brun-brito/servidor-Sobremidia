const { fetchAnalyticsData } = require('../services/analyticsService');
const { db } = require("../config/firebase");
const { updateDailyAnalytics } = require("../utils/dailyAnalyticsUpdate");

exports.generateAnalyticsData = async (req, res) => {
  try {
    const { start_date, end_date, locations } = req.body;
    if (!start_date || !end_date)
        return res.status(400).json({ error: 'Data de início e fim são obrigatórias.' });
    
    if (!Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ error: 'A lista de locais é obrigatória.' });
    }
    
    const data = await fetchAnalyticsData(start_date, end_date, locations);
    res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao buscar dados de analytics:', error.message);
    res.status(500).json({ error: 'Erro ao buscar dados de analytics.' });
  }
};

exports.updateDailyAnalytics = async (req, res) => {
  try {
    console.log("[INFO] atualizando analytics Manualmente...");
    await updateDailyAnalytics();
    console.log("[INFO] Processo concluído com sucesso!");
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ERROR] Erro inesperado:", error);
    res.status(500).json({ error: 'Erro ao atualizar analytics.' });
  }
};

exports.listAllPaineis = async (req, res) => {
  try {
    const snapshot = await db.collection("analytics").doc("paineis").collection("lista").get();
    const paineis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(paineis);
  } catch (error) {
    console.error('Erro ao buscar paineis:', error.message);
    res.status(500).json({ error: 'Erro ao buscar paineis.' });
  }
}