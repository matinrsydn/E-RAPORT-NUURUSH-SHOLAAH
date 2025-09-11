// File: routes/indikatorKehadiranRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/indikatorKehadiranController');

// Rute untuk membaca dan membuat data
router.get('/', controller.getAll);
router.post('/', controller.create);

// --- INI RUTE YANG HILANG DAN MENYEBABKAN ERROR 404 ---
router.put('/:id', controller.update);

// --- RUTE UNTUK HAPUS (DELETE) ---
router.delete('/:id', controller.delete);

// Rute untuk aktifasi & nonaktifasi
router.patch('/:id/deactivate', controller.deactivate);
router.patch('/:id/activate', controller.activate);

module.exports = router;