const Booking  = require('../models/Booking');
const mongoose = require('mongoose');
const R        = require('../config/restaurant');
const { validatePartySize, isPastDate, formatDisplayDate } = require('../utils/dateUtils');

// In-memory fallback (when MongoDB not connected)
const memoryDB = [];

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

// ── Get occupied table numbers for a specific date + time ─────
// Returns a Set of table numbers (1-5) already booked
async function getOccupiedTables(date, time) {
  let bookings;
  if (isDBConnected()) {
    bookings = await Booking.find({ date, time, status: 'confirmed' }).lean();
  } else {
    bookings = memoryDB.filter(b => b.date === date && b.time === time && b.status === 'confirmed');
  }
  return new Set(bookings.map(b => b.tableNumber).filter(n => n != null));
}

// ── Find the lowest-numbered free table for date + time ───────
async function findAvailableTable(date, time) {
  const occupied = await getOccupiedTables(date, time);
  for (let t = 1; t <= R.TOTAL_TABLES; t++) {
    if (!occupied.has(t)) return t;
  }
  return null;  // all tables taken
}

// ── Book Table ────────────────────────────────────────────────
async function bookTable(data) {
  // ── 1. Basic presence checks ──────────────────────────────
  if (!data || typeof data !== 'object')
    return { success: false, error: 'Invalid booking data' };

  const name = (data.customerName || data.name || '').trim();
  if (!name)          return { success: false, error: 'Customer name is required' };
  if (!data.date)     return { success: false, error: 'Date is required' };
  if (!data.time)     return { success: false, error: 'Time is required' };

  // ── 2. Date must be canonical YYYY-MM-DD and not in the past ─
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { success: false, error: `Invalid date format: "${data.date}". Expected YYYY-MM-DD.` };
  }
  if (isPastDate(data.date)) {
    return { success: false, error: `Cannot book for a past date (${data.date}).` };
  }

  // ── 3. Time must be a valid canonical seating slot ────────
  if (!R.SEATING_TIMES.includes(data.time)) {
    return {
      success: false,
      error: `Invalid time "${data.time}". Valid seatings are: ${R.SEATING_TIMES.join(', ')}.`,
    };
  }

  // ── 4. Party size — strict integer, no parseInt fallback ──
  const sizeCheck = validatePartySize(data.people, R.MAX_GUESTS_PER_TABLE, R.MIN_GUESTS);
  if (!sizeCheck.valid) {
    return { success: false, error: sizeCheck.error };
  }
  const people = sizeCheck.value;

  // ── 5. Find an actual available table for this date+time ──
  const tableNumber = await findAvailableTable(data.date, data.time);
  if (tableNumber === null) {
    // All 5 tables taken — suggest other slots on same date
    const otherSlots = await Promise.all(
      R.SEATING_TIMES.filter(s => s !== data.time).map(async slot => {
        const t = await findAvailableTable(data.date, slot);
        return t ? slot : null;
      })
    );
    const alts = otherSlots.filter(Boolean);
    const altMsg = alts.length
      ? ` We do have tables available at: ${alts.join(', ')} on ${formatDisplayDate(data.date)}.`
      : '';
    return {
      success: false,
      error: `All ${R.TOTAL_TABLES} tables are booked for ${data.time} on ${formatDisplayDate(data.date)}.${altMsg}`,
    };
  }

  // ── 6. Build and save the booking ─────────────────────────
  const bookingData = {
    bookingId:       `BK${Date.now().toString().slice(-7)}`,
    customerName:    name,
    date:            data.date,
    time:            data.time,
    people,
    tableNumber,
    phone:           (data.phone || '').trim(),
    email:           (data.email || '').trim().toLowerCase(),
    specialRequests: (data.specialRequests || '').trim(),
    occasion:        data.occasion || '',
    status:          'confirmed',
  };

  if (isDBConnected()) {
    try {
      const booking = new Booking(bookingData);
      const saved   = await booking.save();
      console.log(`✅ Booked: ${saved.bookingId} — ${saved.date} ${saved.time} Table ${tableNumber} × ${people} guests`);
      return { success: true, booking: saved.toObject() };
    } catch (err) {
      console.error('DB booking error:', err.message);
      if (err.code === 11000) {
        return { success: false, error: 'Duplicate booking ID — please try again.' };
      }
      // Fall through to memory
    }
  }

  const memBooking = { ...bookingData, _id: bookingData.bookingId, createdAt: new Date() };
  memoryDB.push(memBooking);
  console.log(`✅ Memory booking: ${bookingData.bookingId} — Table ${tableNumber}`);
  return { success: true, booking: memBooking };
}

// ── Cancel Reservation ────────────────────────────────────────
async function cancelReservation(identifier) {
  if (!identifier) return { success: false, message: 'No identifier provided' };

  if (isDBConnected()) {
    try {
      const booking = await Booking.findOneAndUpdate(
        {
          $or: [
            { bookingId: identifier },
            { customerName: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          ],
          status: { $ne: 'cancelled' },
        },
        { status: 'cancelled' },
        { new: true }
      );
      if (booking) {
        console.log(`🚫 Cancelled: ${booking.bookingId} (Table ${booking.tableNumber} released)`);
        return { success: true, booking: booking.toObject() };
      }
    } catch (err) {
      console.error('DB cancel error:', err.message);
    }
  }

  const idx = memoryDB.findIndex(b =>
    b.bookingId === identifier ||
    b.customerName?.toLowerCase() === identifier?.toLowerCase()
  );
  if (idx !== -1 && memoryDB[idx].status !== 'cancelled') {
    memoryDB[idx].status = 'cancelled';
    console.log(`🚫 Memory cancel: ${memoryDB[idx].bookingId}`);
    return { success: true, booking: memoryDB[idx] };
  }
  return { success: false, message: 'Reservation not found' };
}

// ── Check Availability ────────────────────────────────────────
// date must already be YYYY-MM-DD (resolved by caller)
async function checkAvailability(date, time, people) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { available: false, error: 'Invalid or missing date' };
  }
  if (isPastDate(date)) {
    return { available: false, error: 'That date has already passed' };
  }
  if (time && !R.SEATING_TIMES.includes(time)) {
    return { available: false, error: `Invalid time. Valid slots: ${R.SEATING_TIMES.join(', ')}` };
  }

  if (people !== undefined && people !== null) {
    const sizeCheck = validatePartySize(people, R.MAX_GUESTS_PER_TABLE, R.MIN_GUESTS);
    if (!sizeCheck.valid) return { available: false, error: sizeCheck.error };
  }

  // Check the specific slot requested
  const specificAvailable = time ? (await findAvailableTable(date, time)) !== null : null;

  // Check all slots for this date
  const slotDetails = await Promise.all(
    R.SEATING_TIMES.map(async slot => {
      const occupied = await getOccupiedTables(date, slot);
      const tablesLeft = R.TOTAL_TABLES - occupied.size;
      return { slot, tablesLeft, available: tablesLeft > 0 };
    })
  );

  const availableSlots = slotDetails.filter(s => s.available).map(s => s.slot);

  return {
    available:      time ? specificAvailable : availableSlots.length > 0,
    date,
    displayDate:    formatDisplayDate(date),
    time,
    slotDetails,
    availableSlots,
    totalTables:    R.TOTAL_TABLES,
    maxPerTable:    R.MAX_GUESTS_PER_TABLE,
  };
}

// ── Get All Bookings (with optional filters) ──────────────────
async function getAllBookings(filters = {}) {
  if (isDBConnected()) {
    try {
      const query = {};
      if (filters.status) query.status = filters.status;
      if (filters.date)   query.date   = filters.date;
      return Booking.find(query).sort({ date: 1, time: 1, tableNumber: 1 }).limit(500).lean();
    } catch (err) {
      console.error('DB fetch error:', err.message);
    }
  }
  return memoryDB
    .filter(b => {
      if (filters.status && b.status !== filters.status) return false;
      if (filters.date   && b.date   !== filters.date)   return false;
      return true;
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

module.exports = {
  bookTable,
  cancelReservation,
  checkAvailability,
  getAllBookings,
  findAvailableTable,
  getOccupiedTables,
};
