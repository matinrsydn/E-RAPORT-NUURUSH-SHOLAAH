const express = require('express');
const router = express.Router();
const controller = require('../controllers/promosiController');

router.post('/execute', controller.executePromosi);

module.exports = router;
