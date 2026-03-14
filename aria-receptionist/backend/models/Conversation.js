const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  messages: [messageSchema],
  intent: {
    type: String,
    default: 'general',
  },
  bookingRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'unknown'],
    default: 'unknown',
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  metadata: {
    userAgent: String,
    ip: String,
  },
}, {
  timestamps: true,
});

conversationSchema.index({ createdAt: -1 });
conversationSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
