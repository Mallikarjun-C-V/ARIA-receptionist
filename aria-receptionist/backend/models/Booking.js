const mongoose = require('mongoose');

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
  date: {
    type: String,
    required: [true, 'Date is required'],
    trim: true,
  },
  time: {
    type: String,
    required: [true, 'Time is required'],
    trim: true,
  },
  people: {
    type: Number,
    required: [true, 'Number of guests is required'],
    min: [1, 'Minimum 1 guest'],
    max: [12, 'Maximum 12 guests'],
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  specialRequests: {
    type: String,
    trim: true,
    maxlength: [500, 'Special requests cannot exceed 500 characters'],
    default: '',
  },
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
  // Track whether reminder email was sent at reservation time
  reminderSent: {
    type: Boolean,
    default: false,
  },
  // Track email notifications
  emailsSent: {
    confirmation: { type: Boolean, default: false },
    reminder:     { type: Boolean, default: false },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

bookingSchema.index({ date: 1, time: 1 });
bookingSchema.index({ customerName: 1 });
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ status: 1, email: 1, reminderSent: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
