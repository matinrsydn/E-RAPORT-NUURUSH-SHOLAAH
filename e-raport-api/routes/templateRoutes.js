const express_t = require('express');
const router_t = express_t.Router();
const controller_t = require('../controllers/templateController');

router_t.post('/upload', controller_t.uploadTemplates);
router_t.get('/generate/:siswaId/:semester/:tahun_ajaran', controller_t.generateRaport);
module.exports = router_t;