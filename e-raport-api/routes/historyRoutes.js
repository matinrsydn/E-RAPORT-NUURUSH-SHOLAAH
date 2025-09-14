const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

// Update catatan_akademik and catatan_sikap for a history row
router.put('/:historyId/catatan', historyController.updateCatatan);

module.exports = router;
