const Booking = require('../models/Booking');
const mongoose = require('mongoose');

// ── Restaurant constants ──────────────────────────────────────
const RESTAURANT = {
  TOTAL_TABLES:   5,
  MAX_PER_TABLE:  10,
  // Three seatings per evening
  TIME_SLOTS: ['5:00 PM', '7:00 PM', '9:00 PM'],
};

// In-memory fallback
const memoryDB = [];
let memCounter = 1000;

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

// ── Count confirmed bookings (tables) for a given date + slot ─
async function countTablesBooked(date, time) {
  if (isDBConnected()) {
    return Booking.countDocuments({ date, time, status: 'confirmed' });
  }
  return memoryDB.filter(b => b.date === date && b.time === time && b.status === 'confirmed').length;
}

// ── Book Table ────────────────────────────────────────────────
async function bookTable(data) {
  if (!data || typeof data !== 'object') return { success: false, error: 'Invalid booking data' };
  if (!data.customerName && !data.name) return { success: false, error: 'Customer name is required' };
  if (!data.date)  return { success: false, error: 'Date is required' };
  if (!data.time)  return { success: false, error: 'Time is required' };

  const people = parseInt(data.people) || 2;

  // Rule 1 — party size cannot exceed one table
  if (people > RESTAURANT.MAX_PER_TABLE) {
    return {
      success: false,
      error: `Maximum ${RESTAURANT.MAX_PER_TABLE} guests per table. For larger parties please call us directly.`,
    };
  }

  // Rule 2 — check if any tables are still free for this slot
  const tablesBooked = await countTablesBooked(data.date, data.time);
  if (tablesBooked >= RESTAURANT.TOTAL_TABLES) {
    return {
      success: false,
      error: `Sorry, all ${RESTAURANT.TOTAL_TABLES} tables are fully booked for ${data.time} on ${data.date}. Please choose a different time.`,
    };
  }

  const bookingData = {
    bookingId:      `BK${++memCounter}`,
    customerName:   (data.customerName || data.name || '').trim(),
    date:           data.date,
    time:           data.time,
    people,
    phone:          data.phone || '',
    email:          data.email || '',
    specialRequests: data.specialRequests || '',
    occasion:       data.occasion || '',
    status:         'confirmed',
    tableNumber:    tablesBooked + 1,   // next available table number
  };

  if (isDBConnected()) {
    try {
      const booking = new Booking(bookingData);
      const saved = await booking.save();
      console.log(`✅ Booking saved: ${saved.bookingId} — Table ${bookingData.tableNumber} for ${people} guests`);
      return { success: true, booking: saved.toObject(), source: 'database' };
    } catch (err) {
      console.error('DB booking error:', err.message);
      // Fall through to memory
    }
  }

  memoryDB.push({ ...bookingData, _id: bookingData.bookingId, createdAt: new Date() });
  return { success: true, booking: bookingData, source: 'memory' };
}

// ── Cancel Reservation ────────────────────────────────────────
async function cancelReservation(identifier) {
  if (isDBConnected()) {
    try {
      const booking = await Booking.findOneAndUpdate(
        {
          $or: [
            { bookingId: identifier },
            { customerName: new RegExp(identifier, 'i') },
          ],
          status: { $ne: 'cancelled' },
        },
        { status: 'cancelled' },
        { new: true }
      );
      if (booking) return { success: true, booking: booking.toObject() };
    } catch (err) {
      console.error('DB cancel error:', err.message);
    }
  }

  const idx = memoryDB.findIndex(b =>
    b.bookingId === identifier ||
    b.customerName?.toLowerCase().includes(identifier?.toLowerCase())
  );
  if (idx !== -1) {
    memoryDB[idx].status = 'cancelled';
    return { success: true, booking: memoryDB[idx] };
  }
  return { success: false, message: 'Reservation not found' };
}

// ── Check Availability ────────────────────────────────────────
async function checkAvailability(date, time, people = 2) {
  if (people > RESTAURANT.MAX_PER_TABLE) {
    return {
      available: false,
      reason: `Maximum ${RESTAURANT.MAX_PER_TABLE} guests per table`,
      availableSlots: [],
    };
  }

  const tablesBooked = await countTablesBooked(date, time);
  const tablesLeft   = RESTAURANT.TOTAL_TABLES - tablesBooked;
  const available    = tablesLeft > 0;

  // Find available slots for that date
  const slotAvailability = await Promise.all(
    RESTAURANT.TIME_SLOTS.map(async slot => {
      const booked = await countTablesBooked(date, slot);
      return { slot, tablesLeft: RESTAURANT.TOTAL_TABLES - booked, available: booked < RESTAURANT.TOTAL_TABLES };
    })
  );
  const availableSlots = slotAvailability.filter(s => s.available).map(s => s.slot);

  return {
    available,
    date,
    time,
    requestedPartySize: people,
    tablesBooked,
    tablesLeft,
    totalTables: RESTAURANT.TOTAL_TABLES,
    availableSlots,
    restaurant: RESTAURANT,
  };
}

// ── Get All Bookings ──────────────────────────────────────────
async function getAllBookings(filters = {}) {
  if (isDBConnected()) {
    try {
      const query = {};
      if (filters.status) query.status = filters.status;
      if (filters.date)   query.date   = filters.date;
      return Booking.find(query).sort({ createdAt: -1 }).limit(200).lean();
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
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ── Get Single Booking ────────────────────────────────────────
async function getBooking(identifier) {
  if (isDBConnected()) {
    try {
      const b = await Booking.findOne({
        $or: [{ bookingId: identifier }, { customerName: new RegExp(identifier, 'i') }],
      }).lean();
      if (b) return b;
    } catch (err) {
      console.error('DB getBooking error:', err.message);
    }
  }
  return memoryDB.find(b =>
    b.bookingId === identifier ||
    b.customerName?.toLowerCase().includes(identifier?.toLowerCase())
  ) || null;
}

module.exports = { bookTable, cancelReservation, checkAvailability, getAllBookings, getBooking, RESTAURANT };
