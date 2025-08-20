const express = require('express');
const router = express.Router();
const nilaiController = require('../controllers/nilaiController');

// Rute untuk mendapatkan siswa beserta nilainya berdasarkan filter
router.get('/filter', nilaiController.getSiswaWithNilaiByFilter);

// Rute untuk menyimpan/memperbarui banyak nilai sekaligus
router.post('/bulk', nilaiController.bulkUpdateOrInsertNilai);

// Rute-rute CRUD standar
router.post('/', nilaiController.createNilai);
router.get('/', nilaiController.getAllNilai);
router.get('/:id', nilaiController.getNilaiById);
router.put('/:id', nilaiController.updateNilai);
router.delete('/:id', nilaiController.deleteNilai);

module.exports = router;