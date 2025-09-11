const express = require('express');
const router = express.Router();
const controller = require('../controllers/kitabController');

router.get('/', controller.getAllKitab);
router.post('/', controller.createKitab);
router.put('/:id', controller.updateKitab);
router.delete('/:id', controller.deleteKitab);

module.exports = router;
