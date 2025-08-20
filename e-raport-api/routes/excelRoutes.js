const express = require('express');
const router = express.Router();
const excelController = require('../controllers/excelController');
// Impor middleware yang sudah diperbarui
const uploadExcel = require('../middleware/upload');

// Gunakan 'uploadExcel.single('file')' untuk menangani satu file dengan field name 'file'
router.post('/upload-nilai', uploadExcel.single('file'), excelController.uploadNilai);

module.exports = router;
