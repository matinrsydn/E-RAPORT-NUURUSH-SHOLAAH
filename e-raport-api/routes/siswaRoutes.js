const express = require('express');
const router = express.Router();
const siswaController = require('../controllers/siswaController');

// List siswa (supports ?kelas_id&?tahun_ajaran_id and optional ?show_all=true)
router.get('/', siswaController.getAllSiswa);

// Return siswa missing histories for a tahun_ajaran (optional kelas_id)
router.get('/missing-histories', siswaController.getMissingHistories);
// get earliest history for a siswa
router.get('/:id/earliest-history', siswaController.getEarliestHistory);
router.post('/', siswaController.createSiswa);

// Backfill missing SiswaKelasHistory rows for a given tahun_ajaran
router.post('/backfill-histories', siswaController.backfillHistories);

// RUTE BARU: untuk mengambil data siswa berdasarkan ID
router.get('/:id', siswaController.getSiswaById);

router.put('/:id', siswaController.updateSiswa);
router.delete('/:id', siswaController.deleteSiswa);

module.exports = router;
