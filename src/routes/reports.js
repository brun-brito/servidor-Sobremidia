const express = require("express");
const { generateReport } = require("../services/reportService");

const router = express.Router();

// Rota para gerar relatórios
router.post("/generate", generateReport);

module.exports = router;
