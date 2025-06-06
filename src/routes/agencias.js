const express = require("express");
const router = express.Router();
const agenciasController = require("../controllers/agenciasController");

router.post("/", agenciasController.createAgencia);
router.get("/", agenciasController.listAgencias);
router.get("/:id", agenciasController.getAgenciaById);
router.put("/:id", agenciasController.updateAgencia);
router.delete("/:id", agenciasController.deleteAgencia);

module.exports = router;