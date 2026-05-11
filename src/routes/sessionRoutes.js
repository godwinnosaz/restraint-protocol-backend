const express = require('express');
const router = express.Router();
const session = require('../controllers/sessionController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/start', authMiddleware, session.startSession);
router.get('/active/:userId', authMiddleware, session.getActiveSession);
router.post('/complete/:sessionId', authMiddleware, session.completeSession);
router.post('/fail/:sessionId', authMiddleware, session.failSession);
router.get('/history/:userId', authMiddleware, session.getSessionHistory);
router.post('/log-event', authMiddleware, session.logEvent);

module.exports = router;
