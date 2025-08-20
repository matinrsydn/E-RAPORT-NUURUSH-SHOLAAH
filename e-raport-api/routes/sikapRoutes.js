const express = require('express');
const router = express.Router();
const sikapController = require('../controllers/sikapController');

// Rute untuk mendapatkan siswa beserta nilai sikap berdasarkan filter
router.get('/filter', sikapController.getSiswaWithSikapByFilter);

// Rute untuk mendapatkan deskripsi sikap berdasarkan filter  
router.get('/deskripsi', sikapController.getDeskripsiSikapByFilter);

// Rute untuk menyimpan/memperbarui banyak nilai sikap sekaligus
router.post('/bulk', sikapController.bulkUpdateOrInsertSikap);

// Rute untuk update deskripsi sikap
router.put('/deskripsi', sikapController.updateDeskripsiSikap);

// Rute-rute CRUD standar
router.post('/', sikapController.createSikap);
router.get('/', sikapController.getAllSikap);
router.get('/:id', sikapController.getSikapById);
router.put('/:id', sikapController.updateSikap);
router.delete('/:id', sikapController.deleteSikap);

module.exports = router;