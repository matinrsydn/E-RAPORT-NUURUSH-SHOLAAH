const express = require('express');
const router = express.Router();
const excelController = require('../controllers/excelController');
const upload = require('../middleware/upload'); // Sekarang file ini sudah ada

// Rute untuk mengunggah file Excel, menggunakan middleware 'upload'
router.post('/upload', upload.single('file'), excelController.uploadExcel);

// Rute untuk mengunduh template dinamis, TIDAK menggunakan middleware 'upload'
router.get('/download-template', excelController.downloadTemplate);

module.exports = router;
