const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const uploadSurat = require('../middleware/uploadSurat');
const controller = require('../controllers/suratKeluarController');

// Rate limiting for downloads
const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { message: 'Terlalu banyak permintaan download, silakan coba lagi nanti' }
});

// Get all surat keluar documents
router.get('/', controller.getAllSuratKeluar);

// POST multipart/form-data with file field 'template'
router.post('/generate-from-template', uploadSurat.single('template'), controller.generateFromTemplate);

// Upload new surat keluar document
router.post('/upload', uploadSurat.single('file'), controller.uploadSuratKeluar);

// Download a surat keluar document (with rate limiting)
router.get('/download/:filename', downloadLimiter, controller.downloadSuratKeluar);

// Delete a surat keluar document
router.delete('/:id', controller.deleteSuratKeluar);

module.exports = router;
