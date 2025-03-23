const express = require("express");
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

// Listar todos os paineis
router.get("/paineis", analyticsController.listAllPaineis);

router.post('/', analyticsController.generateAnalyticsData);

router.post("/update", analyticsController.updateDailyAnalytics);

module.exports = router;