const express_wk = require('express');
const router_wk = express_wk.Router();
const controller_wk = require('../controllers/waliKelasController');
router_wk.get('/', controller_wk.getAllWaliKelas);
router_wk.post('/', controller_wk.createWaliKelas);
router_wk.put('/:id', controller_wk.updateWaliKelas);
router_wk.delete('/:id', controller_wk.deleteWaliKelas);
module.exports = router_wk;