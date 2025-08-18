const express_mp = require('express');
const router_mp = express_mp.Router();
const controller_mp = require('../controllers/mataPelajaranController');
router_mp.get('/', controller_mp.getAllMapel);
router_mp.post('/', controller_mp.createMapel);
router_mp.put('/:id', controller_mp.updateMapel);
router_mp.delete('/:id', controller_mp.deleteMapel);
module.exports = router_mp;