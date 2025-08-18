const express_ot = require('express');
const router_ot = express_ot.Router();
const controller_ot = require('../controllers/orangTuaController');
router_ot.get('/', controller_ot.placeholder);
module.exports = router_ot;