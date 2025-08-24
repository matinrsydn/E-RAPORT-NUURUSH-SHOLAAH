// e-raport-api/routes/raportRoutes.js

const express = require('express');
const router = express.Router();
const raportController = require('../controllers/raportController');

// Debug: Pastikan semua fungsi controller ada
console.log("RAPORT CONTROLLER METHODS:", Object.keys(raportController));

// Route untuk menyimpan data validasi (UTAMA - HARUS ADA!)
// POST /api/raports/save-validated
router.post('/save-validated', (req, res, next) => {
  console.log("🚀 ROUTE /save-validated HIT");
  console.log("📦 Body diterima:", JSON.stringify(req.body, null, 2));
  next();
}, raportController.saveValidatedRaport);

// Route untuk mengambil data raport lengkap
// GET /api/raports/:siswaId/:tahunAjaran/:semester
router.get('/:siswaId/:tahunAjaran/:semester', raportController.getRaportData);

// Routes untuk mengupdate data
// PUT /api/raports/nilai-ujian/:id
router.put('/nilai-ujian/:id', raportController.updateNilaiUjian);

// PUT /api/raports/nilai-hafalan/:id
router.put('/nilai-hafalan/:id', raportController.updateNilaiHafalan);

// PUT /api/raports/kehadiran/:id
router.put('/kehadiran/:id', raportController.updateKehadiran);



module.exports = router;