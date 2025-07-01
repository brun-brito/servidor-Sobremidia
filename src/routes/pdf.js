const express = require("express");
const { generatePDFRelatorio, generatePDFCheckin, generatePDFMidiasAtivas, generatePDFProposta, generatePDFPedidoInsercao } = require("../controllers/pdfController");
const router = express.Router();

router.post("/reports/generate", generatePDFRelatorio);
router.post("/checkin/generate", generatePDFCheckin);
router.post("/midias/generate", generatePDFMidiasAtivas);
router.post("/proposta/generate", generatePDFProposta);
router.post("/pi/generate", generatePDFPedidoInsercao);

module.exports = router;