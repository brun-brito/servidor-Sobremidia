const express = require("express");
const { corsAnywhere } = require("../services/proxyService");

const router = express.Router();

// Rota do proxy, usando método GET
router.get("/", corsAnywhere);

module.exports = router;
