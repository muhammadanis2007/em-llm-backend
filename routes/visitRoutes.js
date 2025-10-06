const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', visitController.createVisitWithSymptoms);
router.get('/:id', visitController.getVisitDetails);

module.exports = router;
