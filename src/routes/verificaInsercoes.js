const express = require("express");
const { handleVerificaInsercoes } = require("../controllers/verificaInsercoesController");
const router = express.Router();

router.get("/", handleVerificaInsercoes);

module.exports = router;