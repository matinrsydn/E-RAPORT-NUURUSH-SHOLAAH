const express_s = require('express');
const router_s = express_s.Router();
const controller_s = require('../controllers/siswaController');
router_s.get('/', controller_s.getAllSiswa);
router_s.post('/', controller_s.createSiswa);
router_s.put('/:id', controller_s.updateSiswa);
router_s.delete('/:id', controller_s.deleteSiswa);
module.exports = router_s;