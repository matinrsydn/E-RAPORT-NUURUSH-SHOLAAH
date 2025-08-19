const express = require('express');
const router = express.Router();
const kelasController = require('../controllers/kelasController');

// Rute untuk mendapatkan semua kelas
router.get('/', kelasController.getAllKelas);

// Rute untuk membuat kelas baru
router.post('/', kelasController.createKelas);

// Rute untuk memperbarui kelas berdasarkan ID
router.put('/:id', kelasController.updateKelas);

// Rute untuk menghapus kelas berdasarkan ID
router.delete('/:id', kelasController.deleteKelas);

module.exports = router;
