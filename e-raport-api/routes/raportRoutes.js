const express = require('express');
const router = express.Router();

const raportController = require('../controllers/raportController');
const raportGeneratorController = require('../controllers/raportGeneratorController');

// ==========================================================
// === PERBAIKAN: Route yang lebih SPESIFIK diletakkan di ATAS ===
// ==========================================================
router.post('/save-validated', raportController.saveValidatedRaport);
router.put('/update/ujian/:id', raportController.updateNilaiUjian);
router.put('/update/hafalan/:id', raportController.updateNilaiHafalan);
router.put('/update/kehadiran/:id', raportController.updateKehadiran);

// === Route untuk Generate Laporan/Dokumen ===
router.get('/generate/nilai/:siswaId/:semester/:tahunAjaranId', raportGeneratorController.generateNilaiReport);
router.get('/generate/sikap/:siswaId/:semester/:tahunAjaranId', raportGeneratorController.generateSikapReport);
router.get('/generate/identitas/:siswaId', raportGeneratorController.generateIdentitas);

// ==========================================================
// Route yang lebih UMUM diletakkan di BAWAH
// ==========================================================
router.get('/:siswaId/:tahunAjaran/:semester', raportController.getRaportData);

module.exports = router;