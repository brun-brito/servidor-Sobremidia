const express = require("express");
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.post('/', analyticsController.generateAnalyticsData);

router.post("/update", analyticsController.updateDailyAnalytics);

module.exports = router;