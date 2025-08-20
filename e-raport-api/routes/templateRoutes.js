const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

// Rute ini akan menangani permintaan POST ke /api/templates/upload
// Perhatikan bahwa kita tidak perlu lagi memanggil middleware upload di sini
// karena sudah ditangani di dalam controller.
router.post('/upload', templateController.uploadTemplate);

// Rute untuk mendapatkan daftar template yang ada
// Akan menangani GET /api/templates/
router.get('/', templateController.getTemplates);

// Rute untuk menghapus template
// Akan menangani DELETE /api/templates/:fileName
router.delete('/:fileName', templateController.deleteTemplate);

// Rute untuk men-generate raport berdasarkan template
// Akan menangani GET /api/templates/generate-raport/:siswaId/:semester/:tahun_ajaran
router.get('/generate-raport/:siswaId/:semester/:tahun_ajaran', templateController.generateRaport);

// Rute untuk men-generate identitas siswa
// Akan menangani GET /api/templates/generate-identitas/:siswaId
router.get('/generate-identitas/:siswaId', templateController.generateIdentitas);


module.exports = router;
