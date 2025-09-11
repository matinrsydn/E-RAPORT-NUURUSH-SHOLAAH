// file: routes/raportRoutes.js (URUTAN SUDAH DIPERBAIKI)

const express = require('express');
const router = express.Router();
const raportGeneratorController = require('../controllers/raportGeneratorController'); 
const raportController = require('../controllers/raportController');

// =================================================================
// 🔥 RUTE SPESIFIK HARUS DI ATAS RUTE UMUM 🔥
// =================================================================

// Rute untuk menyimpan data dari halaman validasi
router.post('/save-validated', raportController.saveValidatedRaport);

// RUTE GENERATE RAPORT (DIPINDAHKAN KE ATAS)
router.get('/generate/nilai/:siswaId/:tahunAjaranId/:semester', raportGeneratorController.generateNilaiReport);
router.get('/generate/sikap/:siswaId/:tahunAjaranId/:semester', raportGeneratorController.generateSikapReport);
router.get('/generate/identitas/:siswaId', raportGeneratorController.generateIdentitas);

// Rute untuk update data individual (yang sudah ada)
router.put('/nilai-ujian/:id', raportController.updateNilaiUjian);
router.put('/nilai-hafalan/:id', raportController.updateNilaiHafalan);
router.put('/kehadiran/:id', raportController.updateKehadiran);
router.put('/sikap/:id', raportController.updateSikap);
router.put('/catatan/:id', raportController.updateCatatanWaliKelas);

// Rute umum untuk mengambil data detail (SEKARANG DI BAWAH)
router.get('/:siswaId/:tahunAjaran/:semester', raportController.getRaportData);


module.exports = router;