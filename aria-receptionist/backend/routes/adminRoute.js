const express   = require('express');
const jwt       = require('jsonwebtoken');
const router    = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { getAllBookings, cancelReservation, getOccupiedTables } = require('../services/toolService');
const { getTodayStr, formatDisplayDate, resolveDate } = require('../utils/dateUtils');
const Conversation = require('../models/Conversation');
const mongoose  = require('mongoose');
const R         = require('../config/restaurant');

// ── POST /api/admin/login ─────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { username, role: 'admin' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '8h' }
  );
  res.json({ token, username, expiresIn: '8h' });
});

// ── GET /api/admin/bookings ───────────────────────────────────
// Optional ?date=YYYY-MM-DD to filter by date
router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const filters = {};
    if (req.query.date) filters.date = req.query.date;
    const bookings = await getAllBookings(filters);
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

// ── GET /api/admin/capacity?date=YYYY-MM-DD ───────────────────
// Returns table map for a SPECIFIC date only.
// date defaults to today in restaurant timezone if not provided.
router.get('/capacity', adminAuth, async (req, res) => {
  try {
    // Resolve the requested date
    let targetDate = req.query.date;
    if (!targetDate) {
      targetDate = getTodayStr(R.TIMEZONE);
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      // Try to resolve natural-language date in query
      const resolved = resolveDate(targetDate, R.TIMEZONE);
      if (!resolved) return res.status(400).json({ error: `Cannot resolve date: "${targetDate}"` });
      targetDate = resolved;
    }

    // Fetch ONLY confirmed bookings for this specific date
    const dayBookings = await getAllBookings({ date: targetDate, status: 'confirmed' });

    // Build slot map using actual table assignments
    const slotMap = await Promise.all(R.SEATING_TIMES.map(async slot => {
      const slotBookings = dayBookings.filter(b => b.time === slot);
      const occupied     = await getOccupiedTables(targetDate, slot);
      const guestsTotal  = slotBookings.reduce((s, b) => s + (b.people || 0), 0);

      // Build table grid: for each table 1-5, find the booking (if any)
      const tables = Array.from({ length: R.TOTAL_TABLES }, (_, i) => {
        const tableNum = i + 1;
        const booking  = slotBookings.find(b => b.tableNumber === tableNum) || null;
        return {
          tableNumber: tableNum,
          booked:      occupied.has(tableNum),
          booking:     booking ? {
            bookingId:    booking.bookingId,
            customerName: booking.customerName,
            people:       booking.people,
            email:        booking.email,
            occasion:     booking.occasion,
            phone:        booking.phone,
          } : null,
        };
      });

      return {
        slot,
        tables,
        tablesUsed:  occupied.size,
        tablesFree:  R.TOTAL_TABLES - occupied.size,
        guestsTotal,
      };
    }));

    const confirmedCount = dayBookings.length;
    const maxPossible    = R.TOTAL_TABLES * R.SEATING_TIMES.length;

    res.json({
      date:         targetDate,
      displayDate:  formatDisplayDate(targetDate),
      restaurant:   R,
      slotMap,
      totals: {
        totalTables:       R.TOTAL_TABLES,
        totalTimeSlots:    R.SEATING_TIMES.length,
        maxBookings:       maxPossible,
        confirmedBookings: confirmedCount,
        freeSlots:         maxPossible - confirmedCount,
        occupancyPct:      maxPossible > 0 ? Math.round((confirmedCount / maxPossible) * 100) : 0,
        totalGuests:       dayBookings.reduce((s, b) => s + (b.people || 0), 0),
      },
    });
  } catch (e) {
    console.error('Capacity error:', e);
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
      totalBookings:      all.length,
      confirmedBookings:  confirmed.length,
      cancelledBookings:  cancelled.length,
      totalGuests:        guests,
      avgPartySize:       confirmed.length ? (guests / confirmed.length).toFixed(1) : 0,
      totalTables:        R.TOTAL_TABLES,
      maxPerTable:        R.MAX_GUESTS_PER_TABLE,
      maxCapacity:        R.TOTAL_TABLES * R.MAX_GUESTS_PER_TABLE,
      seatingTimes:       R.SEATING_TIMES,
      todayDate:          getTodayStr(R.TIMEZONE),
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

module.exports = router;
