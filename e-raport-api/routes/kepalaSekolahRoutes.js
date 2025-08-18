const express_ks = require('express');
const router_ks = express_ks.Router();
const controller_ks = require('../controllers/kepalaSekolahController');
router_ks.get('/', controller_ks.getAll);
router_ks.post('/', controller_ks.create);
router_ks.put('/:id', controller_ks.update);
router_ks.delete('/:id', controller_ks.delete);
module.exports = router_ks;