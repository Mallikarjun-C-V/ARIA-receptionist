// ============================================================
// Date & Time Utilities — Single place for all date logic
// Used by: toolService, chatController, adminRoute, reminderService
// ============================================================

const { TIMEZONE, SEATING_TIMES } = require('../config/restaurant');

// ── Get today's date string in restaurant timezone (YYYY-MM-DD) ─
function getTodayStr(tz = TIMEZONE) {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
  // en-CA locale always returns YYYY-MM-DD format
}

// ── Add N days to a YYYY-MM-DD string ────────────────────────
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Use local Date constructor to avoid UTC-offset issues
  const date = new Date(y, m - 1, d + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

// ── Resolve relative or natural-language date → YYYY-MM-DD ───
// Handles: "today", "tomorrow", "day after tomorrow",
//          "this Friday", "next Friday", "Monday",
//          "September 5", "Sep 5", "9/5", "2026-09-05"
// Returns null if input cannot be resolved.
function resolveDate(raw, tz = TIMEZONE) {
  if (!raw || typeof raw !== 'string') return null;

  const s = raw.trim();

  // Already canonical YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const today  = getTodayStr(tz);
  const lower  = s.toLowerCase();

  // Simple relative keywords
  if (lower === 'today')                              return today;
  if (lower === 'tomorrow')                           return addDays(today, 1);
  if (lower === 'day after tomorrow' ||
      lower === 'the day after tomorrow')             return addDays(today, 2);

  // Day names: "Monday", "this Monday", "next Monday"
  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayMatch = lower.match(/^(this |next )?(\w+)day$/) ||
                   lower.match(/^(this |next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (dayMatch) {
    const isNext   = (dayMatch[1] || '').trim() === 'next';
    const dayName  = dayMatch[2].toLowerCase() + (dayMatch[0].endsWith('day') && !DAYS.includes(dayMatch[2].toLowerCase() + 'day') ? 'day' : '');
    // rebuild full day name
    const fullDay = lower.replace(/^(this |next )?/, '').trim();
    const targetDow = DAYS.indexOf(fullDay);
    if (targetDow !== -1) {
      const [y, m, d] = today.split('-').map(Number);
      const todayDow  = new Date(y, m - 1, d).getDay();
      let diff = (targetDow - todayDow + 7) % 7;
      if (diff === 0) diff = 7;   // same day = next week occurrence
      if (isNext)     diff += 7;  // "next Monday" = Monday of next week
      return addDays(today, diff);
    }
  }

  // Month-name day: "September 5", "Sep 5", "Sept 5"
  const MONTHS = {
    january:1, jan:1, february:2, feb:2, march:3, mar:3,
    april:4, apr:4, may:5, june:6, jun:6, july:7, jul:7,
    august:8, aug:8, september:9, sep:9, sept:9,
    october:10, oct:10, november:11, nov:11, december:12, dec:12,
  };
  for (const [name, num] of Object.entries(MONTHS)) {
    const re = new RegExp(`^${name}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?$`);
    const m  = lower.match(re);
    if (m) {
      const day  = parseInt(m[1]);
      const year = m[2] ? parseInt(m[2]) : new Date().getFullYear();
      return `${year}-${String(num).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }

  // Slash/dash formats: "9/5", "09/05", "9-5"
  const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (slashMatch) {
    const mo   = parseInt(slashMatch[1]);
    const dy   = parseInt(slashMatch[2]);
    const yr   = slashMatch[3]
      ? (parseInt(slashMatch[3]) < 100 ? 2000 + parseInt(slashMatch[3]) : parseInt(slashMatch[3]))
      : new Date().getFullYear();
    return `${yr}-${String(mo).padStart(2,'0')}-${String(dy).padStart(2,'0')}`;
  }

  return null;   // could not resolve
}

// ── Is dateStr (YYYY-MM-DD) strictly in the past? ─────────────
function isPastDate(dateStr, tz = TIMEZONE) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const today = getTodayStr(tz);
  return dateStr < today;   // string comparison works for ISO dates
}

// ── Normalize any time string → canonical slot or null ────────
// Accepts: "7pm", "7 PM", "7:00 PM", "7:00pm", "19", "19:00"
function normalizeTime(raw) {
  if (!raw || typeof raw !== 'string') return null;

  // Already canonical (case-insensitive check)
  const upper = raw.trim().toUpperCase();
  for (const slot of SEATING_TIMES) {
    if (upper === slot.toUpperCase()) return slot;
  }

  // Parse to 24-hour integer
  let hour = null;

  // Strip spaces for easier matching
  const compact = upper.replace(/\s+/g, '');

  // "7PM", "7:00PM"
  const h12 = compact.match(/^(\d{1,2})(?::00)?PM$/);
  if (h12) {
    const h = parseInt(h12[1]);
    hour = h === 12 ? 12 : h + 12;
  }

  // "7AM", "7:00AM" (unlikely for dinner but handle gracefully)
  const h12am = compact.match(/^(\d{1,2})(?::00)?AM$/);
  if (h12am && hour === null) {
    hour = parseInt(h12am[1]) === 12 ? 0 : parseInt(h12am[1]);
  }

  // "19", "19:00" — 24-hour
  if (hour === null) {
    const h24 = compact.match(/^(\d{1,2})(?::00)?$/);
    if (h24) hour = parseInt(h24[1]);
  }

  if (hour === null) return null;

  // Map 24-hour value to canonical slot
  if (hour === 5  || hour === 17) return '5:00 PM';
  if (hour === 7  || hour === 19) return '7:00 PM';
  if (hour === 9  || hour === 21) return '9:00 PM';

  return null;  // not a valid seating hour
}

// ── Format YYYY-MM-DD for display: "Saturday, September 5, 2026" ─
function formatDisplayDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '';
  // Parse as local noon to avoid off-by-one from UTC midnight
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Validate party size — returns { valid, value, error } ─────
function validatePartySize(raw, max = 10, min = 1) {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { valid: false, error: `Party size must be a whole number between ${min} and ${max}` };
  }
  if (n < min || n > max) {
    return { valid: false, error: `Party size must be between ${min} and ${max} guests` };
  }
  return { valid: true, value: n };
}

module.exports = {
  getTodayStr,
  addDays,
  resolveDate,
  isPastDate,
  normalizeTime,
  formatDisplayDate,
  validatePartySize,
};
