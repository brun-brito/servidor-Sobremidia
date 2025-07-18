const express = require("express");
const router = express.Router();
const verificaEmailController = require("../controllers/verificaEmailController");

// GET /verifica-email
router.get("/", verificaEmailController.getAll);

// GET /verifica-email/:id
router.get("/:id", verificaEmailController.getById);

module.exports = router;
