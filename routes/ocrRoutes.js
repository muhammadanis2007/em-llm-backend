const express = require('express');
const router = express.Router();
const multer = require('multer');
const ocrController = require('../controllers/ocrController');

const upload = multer({ dest: 'uploads/' });

router.post('/lab-ocr', upload.single('labReport'), ocrController.processLabPdf);

module.exports = router;
