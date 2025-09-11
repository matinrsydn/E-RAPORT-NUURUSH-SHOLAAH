// File: routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/stats', dashboardController.getStats);
router.get('/siswa-per-kelas', dashboardController.getSiswaPerKelas);

module.exports = router;