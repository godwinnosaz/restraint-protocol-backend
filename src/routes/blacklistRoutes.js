const express = require('express');
const router = express.Router();
const blacklist = require('../controllers/blacklistController');

router.get('/', blacklist.getBlacklist);

module.exports = router;
