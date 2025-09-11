const express = require('express');
const router = express.Router();
const controller = require('../controllers/kurikulumController');

router.get('/', controller.getKurikulum);
router.post('/', controller.createKurikulum);
router.put('/:id', controller.updateKurikulum);
router.delete('/:id', controller.deleteKurikulum);

module.exports = router;
