const express = require('express');
const router = express.Router();
const excelController = require('../controllers/excelController');
const uploadExcel = require('../middleware/upload');

// Route untuk download template Excel
router.get('/download-template', excelController.downloadTemplate);

// Route untuk upload file Excel
router.post('/upload-nilai', uploadExcel.single('file'), excelController.uploadNilai);

module.exports = router;