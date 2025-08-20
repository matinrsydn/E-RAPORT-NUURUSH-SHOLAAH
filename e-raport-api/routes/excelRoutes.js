const express = require('express');
const router = express.Router();
const excelController = require('../controllers/excelController');
const uploadExcel = require('../middleware/upload');

// ========== ROUTES BARU UNTUK MULTI-SHEET TEMPLATE ==========

// Route untuk download template Excel LENGKAP dengan multiple sheets
router.get('/download-complete-template', excelController.downloadCompleteTemplate);

// Route untuk upload file Excel lengkap dengan multiple sheets
router.post('/upload-complete-data', uploadExcel.single('file'), excelController.uploadCompleteData);

// ========== ROUTES EXISTING DIPERTAHANKAN ==========

// Route untuk download template Excel nilai ujian (individual)
router.get('/download-template', excelController.downloadTemplate);

// Route untuk upload file Excel nilai ujian (individual)
router.post('/upload-nilai', uploadExcel.single('file'), excelController.uploadNilai);

// Route untuk download template hafalan
router.get('/download-template-hafalan', excelController.downloadTemplateHafalan);

// Route untuk upload hafalan
router.post('/upload-hafalan', uploadExcel.single('file'), excelController.uploadHafalan);

// Route untuk download template kehadiran
router.get('/download-template-kehadiran', excelController.downloadTemplateKehadiran);

// Route untuk upload kehadiran
router.post('/upload-kehadiran', uploadExcel.single('file'), excelController.uploadKehadiran);

// Route untuk download template sikap
router.get('/download-template-sikap', excelController.downloadTemplateSikap);

// Route untuk upload sikap
router.post('/upload-sikap', uploadExcel.single('file'), excelController.uploadSikap);

module.exports = router;