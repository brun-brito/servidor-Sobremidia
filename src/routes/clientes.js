const express = require("express");
const router = express.Router();
const clientesController = require("../controllers/clientesController");

router.post("/", clientesController.createCliente);
router.get("/", clientesController.listClientes);
router.get("/:id", clientesController.getClienteById);
router.put("/:id", clientesController.updateCliente);
router.delete("/:id", clientesController.deleteCliente);

module.exports = router;