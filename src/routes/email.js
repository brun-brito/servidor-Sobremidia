const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// Define o endpoint para envio de email
router.post('/checkin', emailController.handleSendMailCheckin);
router.post("/report", emailController.handleSendMailReport);

module.exports = router;