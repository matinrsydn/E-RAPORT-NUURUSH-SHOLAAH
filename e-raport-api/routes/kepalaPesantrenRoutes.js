// file: routes/kepalaPesantrenRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/kepalaPesantrenController');
const uploadSignature = require('../middleware/uploadSignature');

// Rute standar
router.get('/', controller.getAll);
router.post('/', controller.create);
router.delete('/:id', controller.delete);

// Rute untuk update, sekarang menyertakan middleware untuk unggah tanda tangan
// Kode baru yang sudah benar
router.put('/:id/:type', uploadSignature.single('tanda_tangan'), controller.update);

module.exports = router;