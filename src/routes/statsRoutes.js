const express = require('express');
const router = express.Router();
const stats = require('../controllers/statsController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:userId', authMiddleware, stats.getUserStats);

module.exports = router;
