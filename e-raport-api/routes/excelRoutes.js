const express_ex = require('express');
const router_ex = express_ex.Router();
const controller_ex = require('../controllers/excelController');
router_ex.post('/upload-nilai', controller_ex.uploadNilai);
module.exports = router_ex;