const express = require('express');
const router = express.Router();
const ai = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/pre-session', authMiddleware, ai.preSessionAnalysis);
router.get('/session-insight/:sessionId', authMiddleware, ai.getSessionInsight);
router.post('/post-session/:sessionId', authMiddleware, ai.postSessionInsight);
router.get('/user-summary/:userId', authMiddleware, ai.getUserSummary);

module.exports = router;
