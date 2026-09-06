const cron    = require('node-cron');
const Booking = require('../models/Booking');
const { sendReminderEmail } = require('./emailService');
const { getTodayStr } = require('../utils/dateUtils');
const R       = require('../config/restaurant');
const mongoose = require('mongoose');

// ── Parse canonical slot "7:00 PM" → { hour:19, minute:0 } ──
function parseCanonicalTime(timeStr) {
  if (!timeStr) return null;
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let hour = parseInt(m[1]);
  const minute = parseInt(m[2]);
  if (m[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (m[3].toUpperCase() === 'AM' && hour === 12)  hour = 0;
  return { hour, minute };
}

async function checkAndSendReminders() {
  if (mongoose.connection.readyState !== 1) return;

  try {
    // Current time in restaurant timezone
    const now = new Date();
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: R.TIMEZONE }));
    const currentHour   = tzDate.getHours();
    const currentMinute = tzDate.getMinutes();
    // Today's date in restaurant timezone
    const todayStr = getTodayStr(R.TIMEZONE);

    // Only look at confirmed bookings for TODAY with canonical YYYY-MM-DD dates
    const bookings = await Booking.find({
      date:         todayStr,          // exact match — no relative dates possible
      status:       'confirmed',
      email:        { $exists: true, $ne: '' },
      reminderSent: { $ne: true },
    }).lean();

    for (const booking of bookings) {
      const t = parseCanonicalTime(booking.time);
      if (!t) continue;

      if (t.hour === currentHour && t.minute === currentMinute) {
        console.log(`⏰ Reminder: ${booking.bookingId} at ${booking.time} → ${booking.email}`);
        await sendReminderEmail(booking);
        await Booking.findOneAndUpdate(
          { bookingId: booking.bookingId },
          { reminderSent: true, 'emailsSent.reminder': true }
        );
      }
    }
  } catch (err) {
    console.error('Reminder scheduler error:', err.message);
  }
}

function startReminderScheduler() {
  console.log(`⏰ Reminder scheduler started — timezone: ${R.TIMEZONE}`);
  cron.schedule('0 * * * * *', checkAndSendReminders);
}

module.exports = { startReminderScheduler };
