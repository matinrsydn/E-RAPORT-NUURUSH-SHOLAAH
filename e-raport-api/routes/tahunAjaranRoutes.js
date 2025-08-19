const express = require('express');
const router = express.Router();
const tahunAjaranController = require('../controllers/tahunAjaranController');

router.get('/', tahunAjaranController.getAll);
router.post('/', tahunAjaranController.create);
router.put('/:id', tahunAjaranController.update);
router.delete('/:id', tahunAjaranController.delete);

module.exports = router;
