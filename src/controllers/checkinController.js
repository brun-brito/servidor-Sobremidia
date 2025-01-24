const checkinService = require("../services/checkinService");

exports.createCheckIn = async (req, res) => {
    try {
        // Função auxiliar para truncar strings grandes
        const truncateString = (str, maxLength = 50) => {
            if (!str) return null;
            return str.length > maxLength
                ? `${str.substring(0, maxLength / 2)}...${str.substring(str.length - maxLength / 2)}`
                : str;
        };

        // Log detalhado da requisição recebida (com truncamento)
        console.log("[INFO] Requisição recebida no endpoint /checkin:", {
            panelId: req.body.panelId,
            panelName: req.body.panelName,
            mediaPhotos: req.body.mediaPhotos.map((photo) => ({
                mediaId: photo.mediaId,
                mediaName: photo.mediaName,
                mediaPhoto: truncateString(photo.mediaPhoto),
                environmentPhoto: truncateString(photo.environmentPhoto),
                timestampMedia: photo.timestampMedia,
                timestampEnvironment: photo.timestampEnvironment,
            })),
        });

        const { panelId, panelName, mediaPhotos } = req.body;

        // Validar se os campos obrigatórios estão presentes
        if (!panelId || !panelName || !mediaPhotos || mediaPhotos.length === 0) {
            console.error("[ERROR] Dados inválidos:", {
                panelId,
                panelName,
                mediaPhotos: mediaPhotos.map((photo) => ({
                    mediaId: photo.mediaId,
                    mediaName: photo.mediaName,
                    mediaPhoto: photo.mediaPhoto ? "Presente" : "Ausente",
                    environmentPhoto: photo.environmentPhoto ? "Presente" : "Ausente",
                })),
            });
            return res.status(400).json({ error: "Dados inválidos. 'panelId', 'panelName' e 'mediaPhotos' são obrigatórios." });
        }

        // Chamar o serviço para salvar o Check-In
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