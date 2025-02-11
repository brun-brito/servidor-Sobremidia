const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// Define o endpoint para envio de email
router.post('/', emailController.sendEmail);

module.exports = router;