const mongoose = require('mongoose');
const { MAX_GUESTS_PER_TABLE, MIN_GUESTS, TOTAL_TABLES } = require('../config/restaurant');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    default: () => `BK${Date.now().toString().slice(-6)}`,
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  // Always stored as YYYY-MM-DD canonical format
  date: {
    type: String,
    required: [true, 'Date is required'],
    trim: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
  },
  // Always stored as canonical slot: '5:00 PM', '7:00 PM', or '9:00 PM'
  time: {
    type: String,
    required: [true, 'Time is required'],
    enum: {
      values: ['5:00 PM', '7:00 PM', '9:00 PM'],
      message: 'Time must be one of the valid seating slots: 5:00 PM, 7:00 PM, 9:00 PM',
    },
  },
  people: {
    type: Number,
    required: [true, 'Number of guests is required'],
    min: [MIN_GUESTS, `Minimum ${MIN_GUESTS} guest`],
    max: [MAX_GUESTS_PER_TABLE, `Maximum ${MAX_GUESTS_PER_TABLE} guests per table`],
  },
  // Which physical table (1–TOTAL_TABLES) for this date+time
  tableNumber: {
    type: Number,
    min: 1,
    max: TOTAL_TABLES,
    default: null,
  },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  specialRequests: { type: String, trim: true, maxlength: 500, default: '' },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'pending'],
    default: 'confirmed',
  },
  occasion: {
    type: String,
    enum: ['birthday', 'anniversary', 'business', 'date', 'other', ''],
    default: '',
  },
  reminderSent: { type: Boolean, default: false },
  emailsSent: {
    confirmation: { type: Boolean, default: false },
    reminder:     { type: Boolean, default: false },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound index: fast lookup by date+time for capacity checks
bookingSchema.index({ date: 1, time: 1, status: 1 });
bookingSchema.index({ date: 1, time: 1, tableNumber: 1 });
bookingSchema.index({ customerName: 1 });
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ status: 1, email: 1, reminderSent: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
