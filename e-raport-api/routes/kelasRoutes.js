// e-raport-api/routes/kelasRoutes.js

const express = require('express');
const router = express.Router();
const kelasController = require('../controllers/kelasController');

// DEBUG: Pastikan controller ter-load dengan benar
console.log("KELAS CONTROLLER METHODS:", Object.keys(kelasController));

// Rute untuk mendapatkan semua kelas
router.get('/', kelasController.getAllKelas);

// Rute untuk membuat kelas baru
router.post('/', kelasController.createKelas);

// Rute untuk mendapatkan kelas berdasarkan ID (HARUS SETELAH ROUTE SPESIFIK LAINNYA)
router.get('/:id', kelasController.getKelasById);

// Rute untuk memperbarui kelas berdasarkan ID
router.put('/:id', kelasController.updateKelas);

// Rute untuk menghapus kelas berdasarkan ID
router.delete('/:id', kelasController.deleteKelas);

module.exports = router;