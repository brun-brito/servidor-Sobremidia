const express = require("express");
const router = express.Router();
const checkinController = require("../controllers/checkinController");

router.post("/upload-photo", checkinController.uploadPhoto);

router.post("/upload-chunk", checkinController.uploadChunk);
  
router.post('/create', checkinController.createCheckin);

router.get("/", checkinController.getCheckIns);

router.get("/:id", checkinController.getCheckinById);

router.get("/html/:ids", checkinController.displayCheckin);

router.post("/html/:ids", checkinController.authenticateCheckin);

module.exports = router;