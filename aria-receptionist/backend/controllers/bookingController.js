const { getAllBookings, getBooking, bookTable, cancelReservation } = require('../services/toolService');

exports.getAllBookings = async (req, res) => {
  try {
    const { status, date, limit = 50 } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (date) filters.date = date;

    const bookings = await getAllBookings(filters);
    
    // Log for debugging
    console.log(`📋 Admin requested bookings - found ${bookings.length} bookings`);
    
    res.json({
      count: bookings.length,
      bookings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ getAllBookings error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch bookings',
      details: error.message 
    });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await getBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ booking });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { customerName, date, time, people, phone, email, specialRequests, occasion } = req.body;

    if (!customerName || !date || !time || !people) {
      return res.status(400).json({ error: 'Name, date, time, and party size are required' });
    }

    const result = await bookTable({ customerName, date, time, people, phone, email, specialRequests, occasion });

    if (result.success) {
      console.log(`✅ Booking confirmed: ${result.booking.bookingId} for ${customerName}`);
      res.status(201).json({ 
        message: 'Booking created successfully', 
        booking: result.booking,
        source: result.source 
      });
    } else {
      console.log(`❌ Booking failed: ${result.error}`);
      res.status(500).json({ error: result.error || 'Failed to create booking' });
    }
  } catch (error) {
    console.error('❌ createBooking error:', error.message);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const result = await cancelReservation(req.params.id);
    if (result.success) {
      res.json({ message: 'Booking cancelled successfully', booking: result.booking });
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const allBookings = await getAllBookings();
    const confirmed = allBookings.filter(b => b.status === 'confirmed');
    const cancelled = allBookings.filter(b => b.status === 'cancelled');
    const totalGuests = confirmed.reduce((sum, b) => sum + (b.people || 0), 0);

    res.json({
      stats: {
        totalBookings: allBookings.length,
        confirmedBookings: confirmed.length,
        cancelledBookings: cancelled.length,
        totalGuests,
        avgPartySize: confirmed.length ? (totalGuests / confirmed.length).toFixed(1) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
