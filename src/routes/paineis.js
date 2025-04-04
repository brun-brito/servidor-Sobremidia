const express = require("express");
const router = express.Router();
const painelController = require("../controllers/paineisController");

router.get("/", painelController.listarPaineis);
router.get("/:id", painelController.obterPainelPorId);
router.post("/", painelController.criarPainel);
router.put("/:id", painelController.atualizarPainel);
router.delete("/:id", painelController.excluirPainel);

module.exports = router;