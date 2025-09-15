const express = require('express');
const router = express.Router();
const uploadSurat = require('../middleware/uploadSurat');
const controller = require('../controllers/suratKeluarController');

// Get all surat keluar documents
router.get('/', controller.getAllSuratKeluar);

// POST multipart/form-data with file field 'template'
router.post('/generate-from-template', uploadSurat.single('template'), controller.generateFromTemplate);

// Upload new surat keluar document
router.post('/upload', uploadSurat.single('file'), controller.uploadSuratKeluar);

// Download a surat keluar document
router.get('/download/:filename', controller.downloadSuratKeluar);

// Delete a surat keluar document
router.delete('/:id', controller.deleteSuratKeluar);

module.exports = router;
