const express = require('express');
const router = express.Router();
const { synthesizeSpeech } = require('../services/speechService');

router.post('/', async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    if (text.length > 500) return res.status(400).json({ error: 'Text too long (max 500 chars)' });

    const audioBuffer = await synthesizeSpeech(text, voiceId);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-cache',
    });
    res.send(audioBuffer);
  } catch (e) {
    // Return 503 so frontend falls back to Web Speech API
    res.status(503).json({ error: e.message, fallback: true });
  }
});

module.exports = router;
