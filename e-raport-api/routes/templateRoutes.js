const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

// DEBUGGING: Baris ini akan muncul di terminal jika file ini berhasil dimuat
console.log('✅ File templateRoutes.js berhasil dimuat oleh server.');

// Rute untuk mengunggah template Word
router.post('/upload', templateController.uploadTemplates);

// Rute untuk membuat raport Word lengkap
router.get('/generate/:siswaId/:semester/:tahun_ajaran', templateController.generateRaport);

// Rute untuk mengunduh template Excel
router.get('/download-excel', templateController.generateExcelTemplate);

// Rute untuk mengunduh file identitas per siswa
router.get('/generate-identitas/:siswaId', templateController.generateIdentitas);

module.exports = router;
