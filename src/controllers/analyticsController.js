const { fetchAnalyticsData } = require('../services/analyticsService');
const { updateDailyAnalytics } = require("../utils/dailyAnalyticsUpdate");

exports.generateAnalyticsData = async (req, res) => {
  try {
    const { start_date, end_date, reportId } = req.body;
    if (!start_date || !end_date)
        return res.status(400).json({ error: 'Data de início e fim são obrigatórias.' });
  
    if (!reportId)
        return res.status(400).json({ error: 'ID do relatório é obrigatório.' });
    
    const data = await fetchAnalyticsData(start_date, end_date, reportId);
    res.status(200).json(data);
  } catch (error) {
    console.error('[ERROR] Erro ao buscar dados de analytics:', error.message);
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