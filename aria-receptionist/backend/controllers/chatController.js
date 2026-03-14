const { processAIMessage } = require('../services/aiService');
const { bookTable, cancelReservation, checkAvailability } = require('../services/toolService');
const { sendConfirmationEmail } = require('../services/emailService');
const { appendBookingToSheet, updateBookingStatusInSheet } = require('../services/sheetsService');
const Conversation = require('../models/Conversation');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

exports.chat = async (req, res) => {
  try {
    const { message, sessionId = 'default', history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
    }

    const conversationHistory = [...history, { role: 'user', content: message }];

    const isBookingQuery = /book|reserve|table|reserv/i.test(message);
    const retries = isBookingQuery ? 5 : 3;

    const aiResult = await processAIMessage(conversationHistory, {}, retries);

    let actionResult = null;
    let bookingData  = null;

    if (aiResult.action && aiResult.action.type) {
      const { type, data } = aiResult.action;

      if (!data || typeof data !== 'object') {
        console.error('Invalid action data:', data);
        actionResult = { success: false, error: 'Invalid action parameters' };
      } else {

        switch (type) {

          // ── BOOK TABLE ────────────────────────────────────────
          case 'book_table': {
            const result = await bookTable(data);
            actionResult = result;

            if (result.success) {
              bookingData = result.booking;
              aiResult.message += ` Your confirmation ID is ${bookingData.bookingId}.`;

              // ── Fire-and-forget: email + sheets (don't block response) ──
              setImmediate(async () => {
                try {
                  // 1. Send confirmation email
                  const emailResult = await sendConfirmationEmail(bookingData);
                  if (emailResult.sent) {
                    await Booking.findOneAndUpdate(
                      { bookingId: bookingData.bookingId },
                      { 'emailsSent.confirmation': true }
                    );
                    console.log(`📧 Confirmation sent to ${bookingData.email}`);
                  }
                } catch (e) {
                  console.error('Email error (non-fatal):', e.message);
                }

                try {
                  // 2. Log to Google Sheets
                  await appendBookingToSheet(bookingData);
                } catch (e) {
                  console.error('Sheets error (non-fatal):', e.message);
                }
              });

              if (bookingData.email) {
                aiResult.message += ` A confirmation email has been sent to ${bookingData.email}.`;
              }
            }
            break;
          }

          // ── CANCEL RESERVATION ────────────────────────────────
          case 'cancel_reservation': {
            const result = await cancelReservation(data.identifier);
            actionResult = result;

            if (result.success) {
              // Update status in Google Sheets too
              setImmediate(async () => {
                try {
                  await updateBookingStatusInSheet(result.booking.bookingId, 'cancelled');
                } catch (e) {
                  console.error('Sheets cancel update (non-fatal):', e.message);
                }
              });
            } else {
              aiResult.message = "I couldn't find a reservation with that information. Could you provide your booking ID or the name used when booking?";
            }
            break;
          }

          // ── CHECK AVAILABILITY ────────────────────────────────
          case 'check_availability': {
            const result = await checkAvailability(data?.date, data?.time, data?.people || 2);
            actionResult = result;
            if (result.availableSlots?.length > 0 && !result.available) {
              aiResult.message += ` However, we do have availability at: ${result.availableSlots.join(', ')}.`;
              aiResult.suggestions = result.availableSlots.slice(0, 3).map(s => `Book at ${s}`);
            }
            break;
          }

          default:
            console.log('Unknown action type:', type);
        }
      }
    }

    // ── Save conversation to DB ──────────────────────────────
    if (isDBConnected()) {
      try {
        await Conversation.findOneAndUpdate(
          { sessionId },
          {
            $push: {
              messages: [
                { role: 'user',      content: message,           timestamp: new Date() },
                { role: 'assistant', content: aiResult.message,  timestamp: new Date() },
              ],
            },
            $set: {
              intent:    aiResult.intent,
              sentiment: aiResult.sentiment,
              ...(bookingData && { bookingRef: bookingData._id }),
            },
          },
          { upsert: true, new: true }
        );
      } catch (dbErr) {
        console.error('DB save error (non-fatal):', dbErr.message);
      }
    }

    // ── Send response ────────────────────────────────────────
    res.json({
      response:     aiResult.message,
      intent:       aiResult.intent,
      suggestions:  aiResult.suggestions,
      sentiment:    aiResult.sentiment,
      missingInfo:  aiResult.missingInfo,
      booking:      bookingData,
      actionResult: actionResult ? {
        type:    aiResult.action?.type,
        success: actionResult.success,
        data:    actionResult,
      } : null,
      sessionId,
    });

  } catch (error) {
    console.error('Chat controller error:', error.message);

    const isTimeout = error.message.includes('timeout');
    const isAPI     = error.message.includes('AI service');

    const response = isTimeout
      ? 'The system is taking longer than expected. Please try again in a moment.'
      : isAPI
      ? 'AI service is temporarily unavailable. Please check your API key and try again.'
      : "I apologize, I'm experiencing a brief interruption. Please try again in a moment.";

    res.status(500).json({
      error: error.message || 'AI service error',
      response,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!isDBConnected()) return res.json({ messages: [], sessionId });
    const conversation = await Conversation.findOne({ sessionId }).lean();
    res.json({ messages: conversation?.messages || [], sessionId, intent: conversation?.intent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};
