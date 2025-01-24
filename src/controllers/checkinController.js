const checkinService = require("../services/checkinService");

// Criar Check-In
exports.createCheckIn = async (req, res) => {
    try {
        const { panelId, panelName, mediaPhotos } = req.body;
        if (!panelId || !panelName || !mediaPhotos || mediaPhotos.length === 0) {
            return res.status(400).json({ error: "Dados inválidos. 'panelId', 'panelName' e 'mediaPhotos' são obrigatórios." });
        }

        const checkInData = await checkinService.saveCheckIn(panelId, panelName, mediaPhotos);
        res.status(201).json({ message: "Check-in criado com sucesso!", checkInData });
    } catch (error) {
        console.error("[ERROR] Erro ao criar check-in:", error);
        res.status(500).json({ error: "Erro interno ao criar o check-in." });
    }
};

// Recuperar Check-Ins
exports.getCheckIns = async (req, res) => {
    try {
        const checkIns = await checkinService.getCheckIns();
        res.status(200).json({ success: true, data: checkIns });
    } catch (error) {
        console.error("[ERROR] Falha ao buscar Check-Ins:", error.message);
        res.status(500).json({ success: false, error: "Erro ao buscar Check-Ins." });
    }
};