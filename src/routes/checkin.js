const express = require("express");
const router = express.Router();
const checkinController = require("../controllers/checkinController");

router.post("/", checkinController.createCheckIn);
router.get("/", checkinController.getCheckIns);

module.exports = router;
