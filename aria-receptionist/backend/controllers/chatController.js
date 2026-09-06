const { processAIMessage }                        = require('../services/aiService');
const { bookTable, cancelReservation, checkAvailability } = require('../services/toolService');
const { sendConfirmationEmail }                   = require('../services/emailService');
const { appendBookingToSheet, updateBookingStatusInSheet } = require('../services/sheetsService');
const { resolveDate, normalizeTime, validatePartySize, formatDisplayDate } = require('../utils/dateUtils');
const Conversation = require('../models/Conversation');
const Booking      = require('../models/Booking');
const mongoose     = require('mongoose');
const R            = require('../config/restaurant');

function isDBConnected() { return mongoose.connection.readyState === 1; }

// ── Resolve and validate booking fields before touching the DB ─
function sanitiseBookingData(raw) {
  const errors = [];

  // Name
  const name = (raw.customerName || raw.name || '').trim();
  if (!name) errors.push('Customer name is required');

  // Date — resolve relative/natural → YYYY-MM-DD
  const resolvedDate = resolveDate(raw.date, R.TIMEZONE);
  if (!resolvedDate) {
    errors.push(`Could not resolve date from: "${raw.date}"`);
  }

  // Time — normalise to canonical slot
  const resolvedTime = normalizeTime(raw.time);
  if (!resolvedTime) {
    errors.push(`Invalid time "${raw.time}". Valid seatings: ${R.SEATING_TIMES.join(', ')}`);
  }

  // Party size — strict integer, no fallback
  const sizeCheck = validatePartySize(raw.people, R.MAX_GUESTS_PER_TABLE, R.MIN_GUESTS);
  if (!sizeCheck.valid) errors.push(sizeCheck.error);

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    data: {
      customerName:    name,
      date:            resolvedDate,   // always YYYY-MM-DD
      time:            resolvedTime,   // always canonical slot
      people:          sizeCheck.value,
      email:           (raw.email || '').trim().toLowerCase(),
      phone:           (raw.phone || '').trim(),
      specialRequests: (raw.specialRequests || '').trim(),
      occasion:        raw.occasion || '',
    },
  };
}

exports.chat = async (req, res) => {
  try {
    const { message, sessionId = 'default', history = [] } = req.body;

    if (!message || typeof message !== 'string')
      return res.status(400).json({ error: 'Message is required' });
    if (message.length > 2000)
      return res.status(400).json({ error: 'Message too long (max 2000 chars)' });

    const conversationHistory = [...history, { role: 'user', content: message }];
    const aiResult = await processAIMessage(conversationHistory);

    let actionResult = null;
    let bookingData  = null;

    if (aiResult.action?.type) {
      const { type, data } = aiResult.action;

      if (!data || typeof data !== 'object') {
        actionResult = { success: false, error: 'Invalid action parameters from AI' };
      } else {

        switch (type) {

          // ── BOOK TABLE ──────────────────────────────────────
          case 'book_table': {
            // Backend is the final authority — sanitise everything
            const sanitised = sanitiseBookingData(data);

            if (!sanitised.valid) {
              // Tell user what's still missing
              aiResult.message = `I still need a bit more information: ${sanitised.errors.join('; ')}. Could you help me with that?`;
              actionResult = { success: false, errors: sanitised.errors };
              break;
            }

            const result = await bookTable(sanitised.data);
            actionResult = result;

            if (result.success) {
              bookingData = result.booking;
              const displayDate = formatDisplayDate(bookingData.date);
              aiResult.message = `Perfect! I've confirmed your reservation — Table ${bookingData.tableNumber} on ${displayDate} at ${bookingData.time} for ${bookingData.people} guest${bookingData.people !== 1 ? 's' : ''}. Your booking ID is ${bookingData.bookingId}.`;

              if (bookingData.email) {
                aiResult.message += ` A confirmation email will be sent to ${bookingData.email}.`;
              }

              // Fire-and-forget email + sheets
              setImmediate(async () => {
                try {
                  const emailResult = await sendConfirmationEmail(bookingData);
                  if (emailResult.sent) {
                    await Booking.findOneAndUpdate(
                      { bookingId: bookingData.bookingId },
                      { 'emailsSent.confirmation': true }
                    );
                  }
                } catch (e) { console.error('Email error:', e.message); }
                try {
                  await appendBookingToSheet(bookingData);
                } catch (e) { console.error('Sheets error:', e.message); }
              });
            } else {
              // Booking failed (full, past date, etc.)
              aiResult.message = result.error || 'Sorry, I was unable to complete that booking.';
            }
            break;
          }

          // ── CANCEL RESERVATION ──────────────────────────────
          case 'cancel_reservation': {
            const result = await cancelReservation(data.identifier);
            actionResult = result;
            if (result.success) {
              aiResult.message = `I've cancelled the reservation for ${result.booking.customerName} (ID: ${result.booking.bookingId}).`;
              setImmediate(async () => {
                try { await updateBookingStatusInSheet(result.booking.bookingId, 'cancelled'); }
                catch (e) { console.error('Sheets cancel:', e.message); }
              });
            } else {
              aiResult.message = "I couldn't find that reservation. Could you double-check the booking ID or the name used?";
            }
            break;
          }

          // ── CHECK AVAILABILITY ──────────────────────────────
          case 'check_availability': {
            // Resolve date + time before checking
            const resolvedDate = resolveDate(data?.date, R.TIMEZONE);
            const resolvedTime = data?.time ? normalizeTime(data.time) : null;

            if (!resolvedDate) {
              aiResult.message = "I need a specific date to check availability. What date were you thinking?";
              break;
            }

            const result = await checkAvailability(resolvedDate, resolvedTime, data?.people);
            actionResult = result;

            if (result.error) {
              aiResult.message = result.error;
            } else if (resolvedTime) {
              if (result.available) {
                aiResult.message = `Great news — we have tables available on ${result.displayDate} at ${resolvedTime}. Shall I book one for you?`;
                aiResult.suggestions = ['Yes, book it', 'Different time', 'Different date'];
              } else {
                const alts = result.availableSlots.filter(s => s !== resolvedTime);
                aiResult.message = `Unfortunately ${resolvedTime} on ${result.displayDate} is fully booked.`;
                if (alts.length) {
                  aiResult.message += ` We do have availability at ${alts.join(' and ')} that evening.`;
                  aiResult.suggestions = alts.map(s => `Book at ${s}`);
                }
              }
            } else {
              const slots = result.availableSlots;
              if (slots.length) {
                aiResult.message = `On ${result.displayDate} we have availability at: ${slots.join(', ')}.`;
                aiResult.suggestions = slots.map(s => `Book at ${s}`);
              } else {
                aiResult.message = `I'm sorry, ${result.displayDate} is fully booked. Can I help you with another date?`;
              }
            }
            break;
          }

          default:
            console.log('Unknown action type:', type);
        }
      }
    }

    // Save conversation
    if (isDBConnected()) {
      try {
        await Conversation.findOneAndUpdate(
          { sessionId },
          {
            $push: {
              messages: [
                { role: 'user',      content: message,          timestamp: new Date() },
                { role: 'assistant', content: aiResult.message, timestamp: new Date() },
              ],
            },
            $set: { intent: aiResult.intent, sentiment: aiResult.sentiment },
          },
          { upsert: true, new: true }
        );
      } catch (e) { console.error('DB save (non-fatal):', e.message); }
    }

    res.json({
      response:    aiResult.message,
      intent:      aiResult.intent,
      suggestions: aiResult.suggestions,
      sentiment:   aiResult.sentiment,
      missingInfo: aiResult.missingInfo,
      booking:     bookingData,
      actionResult: actionResult ? { type: aiResult.action?.type, ...actionResult } : null,
      sessionId,
    });

  } catch (error) {
    console.error('Chat controller error:', error.message);
    res.status(500).json({
      error:    error.message || 'Server error',
      response: "I'm experiencing a brief interruption. Please try again in a moment.",
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!isDBConnected()) return res.json({ messages: [], sessionId });
    const conv = await Conversation.findOne({ sessionId }).lean();
    res.json({ messages: conv?.messages || [], sessionId, intent: conv?.intent });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};
