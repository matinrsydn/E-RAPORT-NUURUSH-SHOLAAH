const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

// Route untuk mengunggah multiple template (nilai.docx, sikap.docx)
router.post('/upload', templateController.uploadTemplate);

// Route untuk mendapatkan daftar template yang sudah diunggah
router.get('/', templateController.getTemplates);

// Route untuk menghapus sebuah template berdasarkan nama filenya
router.delete('/:fileName', templateController.deleteTemplate);

// Route utama untuk men-generate dan mengunduh file raport DOCX yang sudah digabung
router.get('/generate/:siswaId/:semester/:tahun_ajaran', templateController.generateRaport);

module.exports = router;
