const express = require('express');
const router = express.Router();
const indikatorSikapController = require('../controllers/indikatorSikapController');

// Rute untuk mendapatkan semua indikator
router.get('/', indikatorSikapController.getAllIndikator);

// Rute untuk membuat indikator baru
router.post('/', indikatorSikapController.createIndikator);

// Rute untuk memperbarui indikator berdasarkan ID
router.put('/:id', indikatorSikapController.updateIndikator);

// Rute untuk menghapus indikator berdasarkan ID
router.delete('/:id', indikatorSikapController.deleteIndikator);

module.exports = router;
