const express_n = require('express');
const router_n = express_n.Router();
const controller_n = require('../controllers/nilaiController');
router_n.get('/', controller_n.placeholderNilai);
module.exports = router_n;