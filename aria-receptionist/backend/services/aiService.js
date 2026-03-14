const { GoogleGenerativeAI } = require('@google/generative-ai');

// Validate API key exists before initializing
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ CRITICAL: GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are ARIA — Autonomous Receptionist Intelligence Agent — the sophisticated AI receptionist for The Velvet Room, a premium Modern European restaurant.

PERSONALITY: Warm, professional, elegant. Speak naturally like a real human receptionist would. Be concise but personable.

VENUE INFORMATION:
- Name: The Velvet Room
- Cuisine: Modern European with seasonal tasting menus
- Hours: Monday–Sunday, 5:00 PM – 11:00 PM
- Address: 47 Marina Boulevard, San Francisco, CA 94123
- Phone: (415) 555-0192
- Reservations: Required for parties of 1–12
- Dress code: Smart casual
- Parking: Valet available from 5:30 PM
- Private dining: Available for parties of 8–20 (advance booking required)
- Chef's tasting menu: 7 courses, available Fri–Sun only
- Happy hour: 5 PM – 6:30 PM at the bar only

CAPABILITIES:
1. Book a table — collect: guest name, date, time, party size, email (required for confirmation), phone (optional)
2. Cancel reservation — need: booking ID or guest name
3. Check availability — check if date/time slot is open
4. Answer FAQs about the venue
5. Modify reservations
6. General assistance

RULES:
- Always confirm details before booking
- If missing required info (name, date, time, people), ask for it naturally
- Maximum party size is 12 (suggest private dining for larger groups)
- Be warm but efficient — don't be overly verbose
- Detect user sentiment and respond appropriately (if frustrated, be extra apologetic)
- Offer alternative times if requested slot is unavailable

RESPONSE FORMAT — Always respond with valid JSON only, no markdown, no code fences:
{
  "message": "Your natural spoken response (under 80 words)",
  "intent": "greeting|book_table|cancel_reservation|check_availability|modify_booking|faq|general|clarification",
  "action": null,
  "suggestions": [],
  "sentiment": "positive|neutral|negative",
  "missingInfo": []
}

When booking is ready to execute (all info collected — name, date, time, people, email all provided), set action to:
{
  "type": "book_table",
  "data": {
    "customerName": "full name",
    "date": "as provided",
    "time": "as provided",
    "people": number,
    "email": "guest email address",
    "phone": "if provided or empty string",
    "specialRequests": "if any or empty string",
    "occasion": "birthday|anniversary|business|date|other or empty string"
  }
}

When cancelling, set action to:
{
  "type": "cancel_reservation",
  "data": { "identifier": "booking ID or name" }
}

When checking availability, set action to:
{
  "type": "check_availability",
  "data": { "date": "date", "time": "time", "people": number }
}

Set missingInfo array to fields still needed for booking: ["name","date","time","people","email"]
IMPORTANT: Always ask for email before finalising any booking. Email is required to send confirmation.
Set suggestions to 2-3 helpful quick reply options for the user.`;

async function processAIMessage(messages, context = {}, retries = 3) {
  const MAX_RETRIES = retries;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Updated to the most stable high-capacity free model for 2026
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.1-flash-lite-preview',
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      });

      // Build conversation history for Gemini (all but last message)
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const lastMessage = messages[messages.length - 1];
      
      // Validate last message exists and has content
      if (!lastMessage || !lastMessage.content) {
        throw new Error('Invalid message format - no content provided');
      }

      // Pass systemInstruction into startChat (correct placement for this SDK)
      const chat = model.startChat({
        history,
        systemInstruction: {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }],
        },
      });

      // Add timeout promise (45s for booking operations)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI API timeout - request taking too long')), 45000)
      );
      const messagePromise = chat.sendMessage(lastMessage.content);
      
      const result = await Promise.race([messagePromise, timeoutPromise]);
      const rawText = result.response.text();

      // Strip any markdown fences Gemini might add
      const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();

      try {
        const parsed = JSON.parse(cleaned);
        return {
          message: parsed.message || 'How may I assist you?',
          intent: parsed.intent || 'general',
          action: parsed.action || null,
          suggestions: parsed.suggestions || [],
          sentiment: parsed.sentiment || 'neutral',
          missingInfo: parsed.missingInfo || [],
          raw: rawText,
        };
      } catch (parseError) {
        console.error('JSON parse error:', parseError.message);
        // If Gemini didn't return JSON, use the raw text as the message
        return {
          message: rawText.substring(0, 300),
          intent: 'general',
          action: null,
          suggestions: ['Book a table', 'Check availability', 'Learn more'],
          sentiment: 'neutral',
          missingInfo: [],
        };
      }
    } catch (error) {
      lastError = error;
      console.error(`Gemini API error (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
      
      // Retry on network/timeout errors (but not on parse errors)
      if (attempt < MAX_RETRIES && (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('ECONNREFUSED'))) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Don't retry on other errors
      throw error;
    }
  }
  
  throw new Error(`AI service failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

async function generateSummary(conversation) {
  try {
    // Updated to the most stable high-capacity free model for 2026
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' }); 
    const prompt = `Summarize this customer service conversation in 2 sentences. Focus on what was accomplished:\n\n${conversation.map(m => `${m.role}: ${m.content}`).join('\n')}`;
    const result = await model.generateContent(prompt);
    return result.response.text() || '';
  } catch {
    return 'Conversation summary unavailable.';
  }
}

module.exports = { processAIMessage, generateSummary };