const express = require('express');
const router = express.Router();
const raportController = require('../controllers/raportController');

// Route untuk mengambil data raport lengkap
// GET /api/raport/:siswaId/:tahunAjaran/:semester
router.get('/:siswaId/:tahunAjaran/:semester', raportController.getRaportData);

// Routes untuk mengupdate data
// PUT /api/raport/nilai-ujian/:id
router.put('/nilai-ujian/:id', raportController.updateNilaiUjian);

// PUT /api/raport/nilai-hafalan/:id
router.put('/nilai-hafalan/:id', raportController.updateNilaiHafalan);

// PUT /api/raport/kehadiran/:id
router.put('/kehadiran/:id', raportController.updateKehadiran);

module.exports = router;
