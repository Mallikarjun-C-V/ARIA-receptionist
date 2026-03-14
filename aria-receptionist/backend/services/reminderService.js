const cron = require('node-cron');
const Booking = require('../models/Booking');
const { sendReminderEmail } = require('./emailService');
const mongoose = require('mongoose');

// ── Parse time string like "7:00 PM" → { hour: 19, minute: 0 } ─
function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = parseInt(match[1]);
  const minute = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return { hour, minute };
}

// ── Parse date string like "Saturday", "2024-12-28", "tomorrow" ──
// Returns a Date object or null if we can't parse it
function parseBookingDate(dateStr) {
  if (!dateStr) return null;

  // Try direct ISO parse first
  const direct = new Date(dateStr);
  if (!isNaN(direct.getTime())) return direct;

  const today = new Date();
  const lower = dateStr.toLowerCase().trim();

  if (lower === 'today') return today;
  if (lower === 'tomorrow') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  // Day name — find the next occurrence
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const targetDay = days.indexOf(lower.replace('this ','').replace('next ',''));
  if (targetDay !== -1) {
    const d = new Date(today);
    const diff = (targetDay - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  return null;
}

// ── Check bookings and send reminders ────────────────────────
async function checkAndSendReminders() {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const now = new Date();
    const currentHour   = now.getHours();
    const currentMinute = now.getMinutes();

    // Only fetch confirmed bookings that haven't had reminder sent
    const bookings = await Booking.find({
      status: 'confirmed',
      email: { $exists: true, $ne: '' },
      reminderSent: { $ne: true },
    }).lean();

    for (const booking of bookings) {
      const bookingDate = parseBookingDate(booking.date);
      if (!bookingDate) continue;

      const bookingTime = parseTime(booking.time);
      if (!bookingTime) continue;

      // Check if it's the same calendar day
      const sameDay =
        bookingDate.getFullYear() === now.getFullYear() &&
        bookingDate.getMonth()    === now.getMonth() &&
        bookingDate.getDate()     === now.getDate();

      if (!sameDay) continue;

      // Check if current time matches reservation time (within same minute)
      if (bookingTime.hour === currentHour && bookingTime.minute === currentMinute) {
        console.log(`⏰ Sending reminder for booking ${booking.bookingId} at ${booking.time}`);
        await sendReminderEmail(booking);

        // Mark reminder sent so we don't send again
        await Booking.findOneAndUpdate(
          { bookingId: booking.bookingId },
          { reminderSent: true }
        );
      }
    }
  } catch (err) {
    console.error('❌ Reminder check error:', err.message);
  }
}

// ── Start the cron job — runs every minute ────────────────────
function startReminderScheduler() {
  console.log('⏰ Reminder scheduler started — checks every minute');

  // Runs at second 0 of every minute: "0 * * * * *"
  cron.schedule('0 * * * * *', () => {
    checkAndSendReminders();
  });
}

module.exports = { startReminderScheduler };
