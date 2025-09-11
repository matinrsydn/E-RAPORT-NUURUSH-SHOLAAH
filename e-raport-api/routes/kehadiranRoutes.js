// File: routes/indikatorKehadiranRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/indikatorKehadiranController');

router.get('/', controller.getAll);
router.post('/', controller.create);

// --- TAMBAHKAN RUTE UNTUK UPDATE DI SINI ---
router.put('/:id', controller.update);

router.patch('/:id/deactivate', controller.deactivate);
router.patch('/:id/activate', controller.activate);

module.exports = router;