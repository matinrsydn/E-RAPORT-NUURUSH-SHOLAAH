const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const upload = require('../middleware/upload');

// Rute untuk mengunggah file template baru
// Ini akan menangani permintaan POST ke /api/templates/upload
router.post('/upload', upload.single('template'), templateController.uploadTemplate);

// Rute untuk mendapatkan daftar template yang ada
router.get('/', templateController.getTemplates);

// Rute untuk menghapus template
router.delete('/:fileName', templateController.deleteTemplate);

// (Opsional) Rute untuk men-generate raport berdasarkan template
// router.get('/generate-identitas/:siswaId', templateController.generateIdentitas);

module.exports = router;
