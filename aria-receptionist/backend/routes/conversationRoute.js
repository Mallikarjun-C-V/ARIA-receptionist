const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');

function isDBConnected() { return mongoose.connection.readyState === 1; }

// Get all conversations
router.get('/', async (req, res) => {
  if (!isDBConnected()) return res.json({ conversations: [], message: 'DB not connected' });
  try {
    const conversations = await Conversation.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ count: conversations.length, conversations });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get single conversation
router.get('/:sessionId', async (req, res) => {
  if (!isDBConnected()) return res.json({ messages: [] });
  try {
    const conv = await Conversation.findOne({ sessionId: req.params.sessionId }).lean();
    res.json(conv || { messages: [] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Delete conversation
router.delete('/:sessionId', async (req, res) => {
  if (!isDBConnected()) return res.json({ message: 'Deleted (memory)' });
  try {
    await Conversation.deleteOne({ sessionId: req.params.sessionId });
    res.json({ message: 'Conversation deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;
