const { fetchAnalyticsData } = require('../services/analyticsService');

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
