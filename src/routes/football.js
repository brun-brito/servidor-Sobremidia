const express = require("express");
const router = express.Router();
const footballController = require("../controllers/footballController");

router.get("/live", footballController.live);

module.exports = router;
