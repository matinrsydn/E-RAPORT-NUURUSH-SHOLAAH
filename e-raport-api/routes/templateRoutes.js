const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const resolveTahunAjaranId = require('../middleware/resolveTahunAjaranId');

// Route untuk mengunggah multiple template (nilai.docx, sikap.docx)
router.post('/upload', templateController.uploadTemplate);

// Route untuk mendapatkan daftar template yang sudah diunggah
router.get('/', templateController.getTemplates);

// Route untuk menghapus sebuah template berdasarkan nama filenya
router.delete('/:fileName', templateController.deleteTemplate);

// Route utama untuk men-generate dan mengunduh file raport DOCX yang sudah digabung
// apply middleware to resolve textual tahun_ajaran into tahun_ajaran_id
router.get('/generate/:siswaId/:semester/:tahun_ajaran', resolveTahunAjaranId, templateController.generateRaport);

router.get('/generate-identitas/:siswaId', templateController.generateIdentitas);

module.exports = router;
