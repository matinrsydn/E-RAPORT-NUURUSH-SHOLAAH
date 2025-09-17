const express = require('express');
const router = express.Router();
const suratKeluarController = require('../controllers/suratKeluarController');
const { uploadSurat } = require('../middleware/uploadSurat');
const { downloadLimiter, uploadLimiter } = require('../middleware/rateLimiter');

// Get all surat keluar
router.get('/', suratKeluarController.getAllSuratKeluar);

// Generate from template with rate limit
router.post('/generate-from-template', uploadLimiter, suratKeluarController.generateFromTemplate);

// Upload surat keluar with rate limit
router.post('/upload', uploadLimiter, uploadSurat, suratKeluarController.uploadSuratKeluar);

// Download surat keluar with rate limit
router.get('/download/:filename', downloadLimiter, suratKeluarController.downloadSuratKeluar);

// Delete surat keluar
router.delete('/:id', suratKeluarController.deleteSuratKeluar);

module.exports = router;