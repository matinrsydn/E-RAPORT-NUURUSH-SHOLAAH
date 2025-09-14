// file: routes/raportRoutes.js (URUTAN SUDAH DIPERBAIKI)

const express = require('express');
const router = express.Router();
const raportGeneratorController = require('../controllers/raportGeneratorController');
const raportController = require('../controllers/raportController');
const resolveTahunAjaranId = require('../middleware/resolveTahunAjaranId');
const upload = require('../middleware/upload');

// =================================================================
// 🔥 RUTE SPESIFIK HARUS DI ATAS RUTE UMUM 🔥
// =================================================================

// Rute untuk menyimpan data dari halaman validasi
router.post('/save-validated', raportController.saveValidatedRaport);

// Upload Excel, validate and save immediately (replaces draft flow)
router.post('/upload', upload.single('file'), raportController.uploadAndSave);

// Rute dasar: kembalikan daftar batch raport (agar frontend yang memanggil GET /api/raport tidak 404)
router.get('/', raportController.getRaportList);

// RUTE GENERATE RAPORT (DIPINDAHKAN KE ATAS)
router.get('/generate/nilai/:siswaId/:tahunAjaranId/:semester', raportGeneratorController.generateNilaiReport);
router.get('/generate/sikap/:siswaId/:tahunAjaranId/:semester', raportGeneratorController.generateSikapReport);
router.get('/generate/identitas/:siswaId', raportGeneratorController.generateIdentitas);

// Rute untuk update data individual (yang sudah ada)
router.put('/nilai-ujian/:id', raportController.updateNilaiUjian);
router.put('/nilai-hafalan/:id', raportController.updateNilaiHafalan);
// Direct CRUD for Kehadiran removed to enforce using IndikatorKehadiran + uploads
router.put('/sikap/:id', raportController.updateSikap);
router.put('/catatan/:id', raportController.updateCatatanWaliKelas);

// Rute umum untuk mengambil data detail (SEKARANG DI BAWAH)
// legacy textual tahunAjaran route - resolve tahun_ajaran -> tahun_ajaran_id for compatibility
router.get('/:siswaId/:tahunAjaran/:semester', resolveTahunAjaranId, raportController.getRaportData);


module.exports = router;