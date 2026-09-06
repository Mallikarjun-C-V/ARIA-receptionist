// ============================================================
// SINGLE SOURCE OF TRUTH — Restaurant Configuration
// Every file that needs these values imports from here.
// ============================================================

module.exports = {
  NAME:               'The Velvet Room',
  TIMEZONE:           'America/Los_Angeles',   // restaurant's local timezone
  TOTAL_TABLES:       5,
  MAX_GUESTS_PER_TABLE: 10,
  MIN_GUESTS:         1,
  // The only valid booking times
  SEATING_TIMES:      ['5:00 PM', '7:00 PM', '9:00 PM'],
  // Private dining is handled by phone — no standard table booking for >10
  PRIVATE_DINING_MIN: 11,
  PRIVATE_DINING_PHONE: '(415) 555-0192',
};
