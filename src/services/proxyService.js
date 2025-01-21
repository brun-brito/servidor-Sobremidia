const axios = require("axios");

async function corsAnywhere(req, res) {
    const targetUrl = req.query.url; // URL de destino passada como parâmetro
    if (!targetUrl) {
        return res.status(400).json({ error: "A URL é obrigatória" });
    }

    try {
        // Faz a solicitação para a URL alvo
        const response = await axios.get(targetUrl, {
            responseType: "arraybuffer", // Garantir que recebemos a imagem como buffer
        });
        const contentType = response.headers["content-type"];

        // Define o cabeçalho correto para a resposta
        res.set("Content-Type", contentType);
        res.send(response.data);
    } catch (error) {
        console.error("Erro no proxy:", error);
        res.status(500).json({ error: "Falha ao carregar a URL" });
    }
};

module.exports = { corsAnywhere };