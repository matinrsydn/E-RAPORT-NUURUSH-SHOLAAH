const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');
const upload = require('../middleware/upload');

// Rute untuk mengunggah dan validasi file
router.post('/upload', upload.single('file'), draftController.uploadAndValidate);

// Rute untuk mengambil data draft per batch
router.get('/:batchId', draftController.getDraftData);

// Rute untuk melihat preview raport
router.get('/preview/:nis/:semester/:tahun_ajaran', draftController.getRaportPreview);

// --- TAMBAHKAN RUTE INI UNTUK KONFIRMASI ---
router.post('/confirm/:batchId', draftController.confirmAndSave);

module.exports = router;