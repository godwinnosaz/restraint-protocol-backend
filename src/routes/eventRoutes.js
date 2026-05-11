const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/violation', authMiddleware, eventController.logViolation);

module.exports = router;
