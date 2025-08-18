const express_sk = require('express');
const router_sk = express_sk.Router();
const controller_sk = require('../controllers/sikapController');
router_sk.get('/', controller_sk.placeholderSikap);
module.exports = router_sk;