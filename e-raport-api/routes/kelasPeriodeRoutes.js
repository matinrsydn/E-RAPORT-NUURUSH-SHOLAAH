const express = require('express');
const router = express.Router();
const controller = require('../controllers/kelasPeriodeController');

router.get('/', controller.list);
router.get('/resolve', controller.getByKelasAndPeriode);

module.exports = router;
