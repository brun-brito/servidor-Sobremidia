const express = require("express");
const { generatePDFRelatorio, generatePDFCheckin, generatePDFMidiasAtivas } = require("../controllers/pdfController");
const router = express.Router();

router.post("/reports/generate", generatePDFRelatorio);
router.post("/checkin/generate", generatePDFCheckin);
router.post("/midias/generate", generatePDFMidiasAtivas);

module.exports = router;