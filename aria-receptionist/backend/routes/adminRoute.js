const express  = require('express');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { getAllBookings, cancelReservation } = require('../services/toolService');
const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');

const RESTAURANT = {
  TOTAL_TABLES: 5,
  MAX_PER_TABLE: 10,
  TIME_SLOTS: ['5:00 PM', '7:00 PM', '9:00 PM'],
};

// ── POST /api/admin/login ─────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = username === process.env.ADMIN_USERNAME;
  const validPass = password === process.env.ADMIN_PASSWORD;

  if (!validUser || !validPass) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '8h' }
  );

  res.json({ token, username, expiresIn: '8h' });
});

// ── GET /api/admin/bookings — all bookings (protected) ────────
router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const bookings = await getAllBookings();
    res.json({ bookings, count: bookings.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/admin/bookings/:id/cancel ─────────────────────
router.patch('/bookings/:id/cancel', adminAuth, async (req, res) => {
  try {
    const result = await cancelReservation(req.params.id);
    if (result.success) res.json({ booking: result.booking });
    else res.status(404).json({ error: 'Booking not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/admin/capacity — table map stats ─────────────────
router.get('/capacity', adminAuth, async (req, res) => {
  try {
    const all = await getAllBookings({ status: 'confirmed' });

    // Build slot map: for each time slot, list bookings and free tables
    const slotMap = RESTAURANT.TIME_SLOTS.map(slot => {
      const slotBookings = all.filter(b => b.time === slot && b.status === 'confirmed');
      const tablesUsed   = slotBookings.length;
      const tablesFree   = RESTAURANT.TOTAL_TABLES - tablesUsed;
      const guestsTotal  = slotBookings.reduce((s, b) => s + (b.people || 0), 0);

      // Assign bookings to table numbers 1..5
      const tables = Array.from({ length: RESTAURANT.TOTAL_TABLES }, (_, i) => {
        const booking = slotBookings[i] || null;
        return {
          tableNumber: i + 1,
          booked: !!booking,
          booking: booking ? {
            bookingId:    booking.bookingId,
            customerName: booking.customerName,
            people:       booking.people,
            email:        booking.email,
            occasion:     booking.occasion,
          } : null,
        };
      });

      return { slot, tables, tablesUsed, tablesFree, guestsTotal };
    });

    // Overall stats
    const totalConfirmed = all.filter(b => b.status === 'confirmed').length;
    const totalGuests    = all.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.people || 0), 0);
    const maxPossible    = RESTAURANT.TOTAL_TABLES * RESTAURANT.TIME_SLOTS.length;

    res.json({
      restaurant: RESTAURANT,
      slotMap,
      totals: {
        totalTables:    RESTAURANT.TOTAL_TABLES,
        totalTimeSlots: RESTAURANT.TIME_SLOTS.length,
        maxBookings:    maxPossible,
        confirmedBookings: totalConfirmed,
        freeSlots:      maxPossible - totalConfirmed,
        occupancyPct:   maxPossible > 0 ? Math.round((totalConfirmed / maxPossible) * 100) : 0,
        totalGuests,
        maxGuests:      maxPossible * RESTAURANT.MAX_PER_TABLE,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/admin/conversations ─────────────────────────────
router.get('/conversations', adminAuth, async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.json({ conversations: [] });
  try {
    const conversations = await Conversation.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ conversations });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/admin/stats ──────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const all       = await getAllBookings();
    const confirmed = all.filter(b => b.status === 'confirmed');
    const cancelled = all.filter(b => b.status === 'cancelled');
    const guests    = confirmed.reduce((s, b) => s + (b.people || 0), 0);

    res.json({
      totalBookings:     all.length,
      confirmedBookings: confirmed.length,
      cancelledBookings: cancelled.length,
      totalGuests:       guests,
      avgPartySize:      confirmed.length ? (guests / confirmed.length).toFixed(1) : 0,
      totalTables:       RESTAURANT.TOTAL_TABLES,
      maxPerTable:       RESTAURANT.MAX_PER_TABLE,
      maxCapacity:       RESTAURANT.TOTAL_TABLES * RESTAURANT.MAX_PER_TABLE,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
