const Booking = require('../models/Booking');

// In-memory fallback when MongoDB is unavailable (max 1000 entries to prevent memory leak)
const memoryDB = [];
let memCounter = 1000;
let useMemory = false;
const MAX_MEMORY_ENTRIES = 1000;

// Check if mongoose is connected
const mongoose = require('mongoose');
function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

// ─── Book Table ───────────────────────────────────────────────
async function bookTable(data) {
  // Validate required fields
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Invalid booking data' };
  }
  
  if (!data.customerName && !data.name) {
    return { success: false, error: 'Customer name is required' };
  }
  if (!data.date) {
    return { success: false, error: 'Date is required' };
  }
  if (!data.time) {
    return { success: false, error: 'Time is required' };
  }
  
  const bookingData = {
    customerName: (data.customerName || data.name || '').trim(),
    date: data.date,
    time: data.time,
    people: parseInt(data.people) || 2,
    phone: data.phone || '',
    email: data.email || '',
    specialRequests: data.specialRequests || '',
    occasion: data.occasion || '',
    status: 'confirmed',
  };

  // ALWAYS try to save to DB first
  let savedToDb = false;
  let dbBooking = null;
  
  if (isDBConnected()) {
    try {
      const booking = new Booking(bookingData);
      dbBooking = await booking.save();
      savedToDb = true;
      console.log(`✅ Booking saved to MongoDB:`, dbBooking.bookingId);
      return { 
        success: true, 
        booking: dbBooking.toObject(),
        source: 'database'
      };
    } catch (err) {
      console.error('❌ DB booking error:', err.message);
      // Don't fall back to memory - require DB for production
      return { 
        success: false, 
        error: `Database error: ${err.message}`,
        source: 'database-failed'
      };
    }
  } else {
    console.warn('⚠️ MongoDB is NOT connected - cannot save booking to database');
    return { 
      success: false, 
      error: 'Database is unavailable. Please check connection and try again.',
      source: 'no-connection'
    };
  }
}

// ─── Cancel Reservation ───────────────────────────────────────
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
      if (booking) {
        console.log(`✅ Booking cancelled in MongoDB:`, identifier);
        return { success: true, booking: booking.toObject() };
      }
      return { success: false, error: 'Booking not found' };
    } catch (err) {
      console.error('❌ DB cancel error:', err.message);
      return { success: false, error: `Database error: ${err.message}` };
    }
  }
  
  console.warn('⚠️ MongoDB not connected - cannot cancel booking');
  return { success: false, error: 'Database is unavailable' };
}

// ─── Check Availability ───────────────────────────────────────
async function checkAvailability(date, time, people = 2) {
  // Validate parameters
  if (!date || !time) {
    return { available: false, availableSlots: [], error: 'Date and time required' };
  }
  
  const numPeople = parseInt(people) || 2;
  if (numPeople < 1) {
    return { available: false, availableSlots: [], error: 'Party size must be at least 1' };
  }
  
  const maxCapacityPerSlot = 50; // total seats
  const reservedSeats = { '5:00 PM': 0, '5:30 PM': 0, '6:00 PM': 0, '6:30 PM': 0, '7:00 PM': 0, '7:30 PM': 0, '8:00 PM': 0, '8:30 PM': 0, '9:00 PM': 0, '9:30 PM': 0 };

  let existingBookings = [];

  if (isDBConnected()) {
    try {
      existingBookings = await Booking.find({
        date,
        status: 'confirmed',
      }).lean();
    } catch (err) {
      console.error('DB availability error:', err.message);
      existingBookings = memoryDB.filter(b => b.date === date && b.status === 'confirmed');
    }
  } else {
    existingBookings = memoryDB.filter(b => b.date === date && b.status === 'confirmed');
  }

  // Count seats per time slot
  existingBookings.forEach(b => {
    if (reservedSeats[b.time] !== undefined) {
      reservedSeats[b.time] += b.people;
    }
  });

  const requestedSeats = reservedSeats[time] || 0;
  const available = (maxCapacityPerSlot - requestedSeats) >= numPeople;

  // Build available slots
  const availableSlots = Object.entries(reservedSeats)
    .filter(([t, seats]) => (maxCapacityPerSlot - seats) >= numPeople)
    .map(([t]) => t);

  return {
    available,
    date,
    time,
    requestedPartySize: numPeople,
    remainingCapacity: Math.max(0, maxCapacityPerSlot - requestedSeats),
    availableSlots: availableSlots.slice(0, 5),
  };
}

// ─── Get All Bookings ─────────────────────────────────────────
async function getAllBookings(filters = {}) {
  // ALWAYS retrieve from DB if connected
  if (isDBConnected()) {
    try {
      const query = {};
      if (filters.status) query.status = filters.status;
      if (filters.date) query.date = filters.date;
      const bookings = await Booking.find(query).sort({ createdAt: -1 }).limit(100).lean();
      console.log(`📊 Retrieved ${bookings.length} bookings from MongoDB`);
      return bookings;
    } catch (err) {
      console.error('❌ DB fetch error:', err.message);
      // Return empty on error instead of falling back
      return [];
    }
  }
  
  console.warn('⚠️ MongoDB not connected - returning empty list (no memory fallback for safety)');
  return [];
}

// ─── Get Single Booking ───────────────────────────────────────
async function getBooking(identifier) {
  if (isDBConnected()) {
    try {
      const booking = await Booking.findOne({
        $or: [
          { bookingId: identifier },
          { customerName: new RegExp(identifier, 'i') },
        ],
      }).lean();
      if (booking) {
        console.log(`✅ Retrieved booking from MongoDB:`, identifier);
        return booking;
      }
      return null;
    } catch (err) {
      console.error('❌ DB getBooking error:', err.message);
      return null;
    }
  }
  
  console.warn('⚠️ MongoDB not connected');
  return null;
}

module.exports = {
  bookTable,
  cancelReservation,
  checkAvailability,
  getAllBookings,
  getBooking,
};
