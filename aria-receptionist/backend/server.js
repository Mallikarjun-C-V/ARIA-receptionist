require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { startReminderScheduler } = require('./services/reminderService');

const app = express();

connectDB();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.ADMIN_URL    || 'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ],
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, legacyHeaders: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'ARIA Receptionist API', version: '2.0.0',
  timestamp: new Date().toISOString(),
}));

// Routes
app.use('/api/chat',          require('./routes/chatRoute'));
app.use('/api/bookings',      require('./routes/bookingRoute'));
app.use('/api/conversations', require('./routes/conversationRoute'));
app.use('/api/availability',  require('./routes/availabilityRoute'));
app.use('/api/tts',           require('./routes/ttsRoute'));
app.use('/api/admin',         require('./routes/adminRoute'));   // ← new

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 ARIA API — port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Admin:  http://localhost:5174  (user: ${process.env.ADMIN_USERNAME || 'admin'})`);
  console.log(`📧 Email:  ${process.env.EMAIL_USER ? process.env.EMAIL_USER : '⚠️  not configured'}`);
  console.log(`🪑 Tables: 5 tables × 10 seats × 3 seatings\n`);
  startReminderScheduler();
});

module.exports = app;
