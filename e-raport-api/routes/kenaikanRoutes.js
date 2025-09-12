const express = require('express');
const router = express.Router();
const controller = require('../controllers/kenaikanKelasController');

router.post('/', controller.promote);
router.get('/logs', controller.listLogs);

module.exports = router;
