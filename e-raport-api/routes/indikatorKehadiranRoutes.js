// e-raport-api/routes/indikatorKehadiranRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/indikatorKehadiranController');

router.get('/', controller.getAll);
router.post('/', controller.create);
router.patch('/:id/deactivate', controller.deactivate);
router.patch('/:id/activate', controller.activate);

module.exports = router;
