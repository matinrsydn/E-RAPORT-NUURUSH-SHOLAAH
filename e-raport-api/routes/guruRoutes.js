// file: routes/guruRoutes.js

const express = require('express');
const router = express.Router();
const controller = require('../controllers/guruController');
const uploadSignature = require('../middleware/uploadSignature');

router.get('/', controller.getAllGuru);
router.get('/:id', controller.getGuruById);
router.post('/', uploadSignature.single('tanda_tangan'), controller.createGuru);

// --- PERBAIKAN DI SINI ---
// Hapus route PUT yang lama dan gunakan satu ini saja.
// Ganti 'guruController' menjadi 'controller'.
router.put('/:id', uploadSignature.single('tanda_tangan'), controller.updateGuru);

router.delete('/:id', controller.deleteGuru);

module.exports = router;