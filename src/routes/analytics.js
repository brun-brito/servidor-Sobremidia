const express = require("express");
const { db, auth } = require("../config/firebase");
const { updateDailyAnalytics } = require("../utils/dailyAnalyticsUpdate");
const { generateAnalyticsData } = require('../controllers/analyticsController');

const router = express.Router();

// Listar todos os paineis
router.get("/paineis", async (req, res) => {
  try {
      const snapshot = await db.collection("analytics").doc("paineis").collection("lista").get();
      const paineis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.status(200).json(paineis);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

router.post('/', generateAnalyticsData);

router.post("/update-analytics", async (req, res) => {
  try {
      console.log("[INFO] atualizando analytics Manualmente...");
      await updateDailyAnalytics();
      console.log("[INFO] Processo concluído com sucesso!");
  } catch (error) {
      console.error("[ERROR] Erro inesperado:", error);
  }
});

module.exports = router;