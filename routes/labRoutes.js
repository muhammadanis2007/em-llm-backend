const express = require('express');
const router = express.Router();
const multer = require('multer');
const labController = require('../controllers/labController');

const upload = multer({ dest: 'uploads/' });

router.post('/upload-lab-report', upload.single('labReport'), labController.uploadLabReport);

module.exports = router;
