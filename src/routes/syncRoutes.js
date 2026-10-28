const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const syncController = require('../controllers/syncController');

router.post('/batch', authMiddleware, syncController.syncBatch);

module.exports = router;
