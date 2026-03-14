// routes/chatRoute.js
const express = require('express');
const router = express.Router();
const { chat, getHistory } = require('../controllers/chatController');

router.post('/', chat);
router.get('/history/:sessionId', getHistory);

module.exports = router;
