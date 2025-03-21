const express = require('express');
const router = express.Router();

const { getToken } = require('../controllers/tokenController');

router.get('/', getToken);

module.exports = router;