const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const controller = require('../controllers/suratKeluarController');

// POST multipart/form-data with file field 'template'
router.post('/generate-from-template', upload.single('template'), controller.generateFromTemplate);

module.exports = router;
