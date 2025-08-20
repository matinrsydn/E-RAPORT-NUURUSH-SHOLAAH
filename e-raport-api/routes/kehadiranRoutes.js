const express = require('express');
const router = express.Router();
const kehadiranController = require('../controllers/kehadiranController');

// Rute untuk mendapatkan siswa beserta kehadiran berdasarkan filter
router.get('/filter', kehadiranController.getSiswaWithKehadiranByFilter);

// Rute untuk mendapatkan template kegiatan
router.get('/template-kegiatan', kehadiranController.getTemplateKegiatan);

// Rute untuk mendapatkan rangkuman kehadiran per siswa
router.get('/rangkuman', kehadiranController.getRangkumanKehadiran);

// Rute untuk menyimpan/memperbarui banyak data kehadiran sekaligus
router.post('/bulk', kehadiranController.bulkUpdateOrInsertKehadiran);

// Rute-rute CRUD standar
router.post('/', kehadiranController.createKehadiran);
router.get('/', kehadiranController.getAllKehadiran);
router.get('/:id', kehadiranController.getKehadiranById);
router.put('/:id', kehadiranController.updateKehadiran);
router.delete('/:id', kehadiranController.deleteKehadiran);

module.exports = router;