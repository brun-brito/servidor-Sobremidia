const express = require("express");
const router = express.Router();
const executivoController = require("../controllers/executivoController");

router.post("/", executivoController.createExecutivo);
router.get("/", executivoController.listExecutivos);
router.get("/:id", executivoController.getExecutivoById);
router.put("/:id", executivoController.updateExecutivo);
router.delete("/:id", executivoController.deleteExecutivo);

module.exports = router;