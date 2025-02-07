const checkinService = require("../services/checkinService");

exports.uploadPhotos = async (req, res) => {
    try {
      // Verifica se os arquivos foram enviados
      if (!req.files || !req.files.fotosMidia || !req.files.fotosEntorno) {
        return res.status(400).json({ error: 'É obrigatório anexar pelo menos uma foto da mídia e uma do entorno.' });
      }
      const result = await checkinService.uploadPhotosService(req.files, req.body);
      res.status(200).json({ message: 'Fotos carregadas com sucesso!', ...result });
    } catch (error) {
      console.error("Erro no upload de fotos do check-in:", error);
      res.status(500).json({ error: 'Erro ao fazer upload das fotos do check-in.' });
    }
  }
  
exports.uploadVideoChunk = async (req, res) => {
    try {
        const result = await checkinService.uploadVideoChunkService(req);
        res.status(200).json(result);
    } catch (error) {
        console.error("Erro no upload em chunks de vídeo:", error);
        res.status(500).json({ error: error.message || 'Erro ao processar o upload em chunks de vídeo.' });
    }
}
  
exports.createCheckin = async (req, res) => {
    try {
      const result = await checkinService.createCheckinService(req.body);
      res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao criar check-in:", error);
      res.status(500).json({ error: error.message || 'Erro ao criar check-in.' });
    }
}

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