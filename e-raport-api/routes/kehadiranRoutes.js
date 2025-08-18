const express_kh = require('express');
const router_kh = express_kh.Router();
const controller_kh = require('../controllers/kehadiranController');
router_kh.get('/', controller_kh.placeholderKehadiran);
module.exports = router_kh;