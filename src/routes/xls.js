const express = require("express");
const router = express.Router();
const { generateXLS } = require("../controllers/xlsController");

router.post("/midias/generate", generateXLS);

module.exports = router;