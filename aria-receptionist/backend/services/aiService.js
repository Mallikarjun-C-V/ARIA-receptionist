const { GoogleGenerativeAI } = require('@google/generative-ai');
const R = require('../config/restaurant');
const { getTodayStr } = require('../utils/dateUtils');

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set'); process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Build system prompt dynamically so today's date is always current
function buildSystemPrompt() {
  const today = getTodayStr(R.TIMEZONE);
  return `You are ARIA — Autonomous Receptionist Intelligence Agent — the professional AI receptionist for The Velvet Room.

PERSONALITY: Warm, professional, elegant. Concise but personable.

TODAY'S DATE: ${today} (restaurant timezone: ${R.TIMEZONE})
Use this to interpret relative dates like "today", "tomorrow", "this Friday".

VENUE INFORMATION:
- Name: ${R.NAME}
- Cuisine: Modern European with seasonal tasting menus
- Hours: Monday–Sunday, 5:00 PM – 11:00 PM
- Seatings: ${R.SEATING_TIMES.join(', ')} ONLY — these are the only valid booking times
- Tables: ${R.TOTAL_TABLES} tables, max ${R.MAX_GUESTS_PER_TABLE} guests per table
- Address: 47 Marina Boulevard, San Francisco, CA 94123
- Phone: ${R.PRIVATE_DINING_PHONE}
- Dress code: Smart casual
- Parking: Valet from 5:30 PM
- Chef's tasting menu: 7 courses, Fri–Sun only
- Happy hour: 5 PM – 6:30 PM at the bar

PARTY SIZE RULES (IMPORTANT):
- Standard booking: 1–${R.MAX_GUESTS_PER_TABLE} guests maximum
- For parties of ${R.PRIVATE_DINING_MIN}+ guests: DO NOT create a standard booking.
  Instead say: "For parties of ${R.PRIVATE_DINING_MIN} or more, we arrange private dining separately.
  Please call us on ${R.PRIVATE_DINING_PHONE} and our events team will assist you."
- Never promise a standard table booking for more than ${R.MAX_GUESTS_PER_TABLE} guests.

BOOKING COLLECTION:
Collect in this order (ask naturally, not like a form):
1. Guest name
2. Date (accept natural language — backend will resolve it)
3. Time (must be one of: ${R.SEATING_TIMES.join(', ')})
4. Party size (1–${R.MAX_GUESTS_PER_TABLE})
5. Email (required — for confirmation)
6. Phone (optional)

DATE HANDLING:
- Accept natural dates: "today", "tomorrow", "this Friday", "next Monday", "September 5"
- Pass the date EXACTLY as the user said — do NOT try to resolve it yourself
- The backend will convert it to a real date
- If user says "7pm" or "19:00", normalise to "7:00 PM" in the action data

RESPONSE FORMAT — Always return valid JSON only, no markdown, no code fences:
{
  "message": "Your spoken response (under 80 words)",
  "intent": "greeting|book_table|cancel_reservation|check_availability|modify_booking|faq|general|clarification",
  "action": null,
  "suggestions": [],
  "sentiment": "positive|neutral|negative",
  "missingInfo": []
}

When ALL required info is collected, set action to:
{
  "type": "book_table",
  "data": {
    "customerName": "full name",
    "date": "exactly as user said, e.g. tomorrow or September 5",
    "time": "5:00 PM or 7:00 PM or 9:00 PM",
    "people": <integer 1–${R.MAX_GUESTS_PER_TABLE}>,
    "email": "email address",
    "phone": "phone if given, else empty string",
    "specialRequests": "if any, else empty string",
    "occasion": "birthday|anniversary|business|date|other or empty string"
  }
}

For cancellation:
{ "type": "cancel_reservation", "data": { "identifier": "booking ID or guest name" } }

For availability check:
{ "type": "check_availability", "data": { "date": "as user said", "time": "canonical slot or null", "people": <number or null> } }

Set missingInfo to still-needed fields: ["name","date","time","people","email"]
Set suggestions to 2–3 helpful quick-reply options.`;
}

async function processAIMessage(messages) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    });

    const history = messages.slice(0, -1).map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat   = model.startChat({
      history,
      systemInstruction: { role: 'user', parts: [{ text: buildSystemPrompt() }] },
    });
    const result = await chat.sendMessage(lastMessage.content);
    const raw    = result.response.text();
    const clean  = raw.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return {
        message:     parsed.message    || 'How may I assist you?',
        intent:      parsed.intent     || 'general',
        action:      parsed.action     || null,
        suggestions: parsed.suggestions || [],
        sentiment:   parsed.sentiment  || 'neutral',
        missingInfo: parsed.missingInfo || [],
      };
    } catch {
      // Non-JSON fallback
      return {
        message:     raw.substring(0, 300),
        intent:      'general',
        action:      null,
        suggestions: ['Book a table', 'Check availability', 'Our hours'],
        sentiment:   'neutral',
        missingInfo: [],
      };
    }
  } catch (error) {
    console.error('Gemini API error:', error.message);
    throw new Error(`AI service error: ${error.message}`);
  }
}

module.exports = { processAIMessage };
