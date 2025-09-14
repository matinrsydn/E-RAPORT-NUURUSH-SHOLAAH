const express = require('express');
const router = express.Router();
const tingkatanController = require('../controllers/tingkatanController');

router.get('/', tingkatanController.getAll);
router.post('/', tingkatanController.create);
router.put('/:id', tingkatanController.update);
// allow PATCH as alternative
router.patch('/:id', tingkatanController.update);
// back-compat: some clients may submit update via POST to /:id
router.post('/:id', tingkatanController.update);
router.delete('/:id', tingkatanController.delete);

module.exports = router;
