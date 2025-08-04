const { getLiveFixtures } = require("../services/footballService");

async function live(req, res) {
    try {
        const data = await getLiveFixtures();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar dados do futebol", details: error.message });
    }
}

module.exports = { live };
