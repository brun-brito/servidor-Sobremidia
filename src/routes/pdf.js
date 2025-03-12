const express = require("express");
const { generatePDFRelatorio, generatePDFCheckin } = require("../controllers/pdfController");
const router = express.Router();

router.post("/reports/generate", generatePDFRelatorio);
router.post("/checkin/generate", generatePDFCheckin);

module.exports = router;