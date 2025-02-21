const express = require("express");
const { generateReport, getReportStatus, getReportResult } = require("../services/reportService");

const router = express.Router();

// Rota para gerar relatórios
router.post("/generate", generateReport);

// Rota para verificar status do relatório
router.get("/status/:reportId", getReportStatus);

// Rota para obter o resultado do relatório
router.get("/result/:reportId", getReportResult);

module.exports = router;
