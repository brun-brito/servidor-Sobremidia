const express = require("express");
const router = express.Router();
const propostaController = require("../controllers/propostaController");

router.post("/", propostaController.createProposta);
router.get("/", propostaController.listPropostas);
router.get("/:id", propostaController.getPropostaById);
router.put("/:id", propostaController.updateProposta);
router.delete("/:id", propostaController.deleteProposta);

module.exports = router;