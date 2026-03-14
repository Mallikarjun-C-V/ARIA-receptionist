require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { startReminderScheduler } = require('./services/reminderService');

const app = express();

// ─── Connect Database ────────────────────────────────────────
connectDB();

// ─── Security ────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// ─── Rate Limiting ───────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ─── Health Check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ARIA Receptionist API',
    version: '2.0.0',
    features: ['voice-ai', 'email-notifications', 'google-sheets', 'reminder-scheduler'],
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/chat',          require('./routes/chatRoute'));
app.use('/api/bookings',      require('./routes/bookingRoute'));
app.use('/api/conversations', require('./routes/conversationRoute'));
app.use('/api/availability',  require('./routes/availabilityRoute'));
app.use('/api/tts',           require('./routes/ttsRoute'));

// ─── 404 ─────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 ARIA Receptionist API running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER ? '✅ ' + process.env.EMAIL_USER : '⚠️  Not configured'}`);
  console.log(`📊 Sheets: ${process.env.GOOGLE_SHEET_ID && !process.env.GOOGLE_SHEET_ID.includes('your_') ? '✅ Configured' : '⚠️  Not configured'}\n`);

  // Start the every-minute reminder scheduler
  startReminderScheduler();
});

module.exports = app;
