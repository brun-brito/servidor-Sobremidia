const express = require("express");
const reportService = require("../services/reportService");
const router = express.Router();
const reportController = require("../controllers/reportController");

router.post("/generate", reportService.generateReport);

router.get("/status/:reportId", reportService.getReportStatus);

router.get("/result/:reportId", reportService.getReportResult);

router.get("/html/:reportId", reportController.handleProtectedHtmlGet);

router.post("/html/:reportId", reportController.handleProtectedHtmlPost);

router.get("/organize", reportController.organizeReportFromUrl);

module.exports = router;
