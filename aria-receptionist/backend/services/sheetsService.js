const { google } = require('googleapis');

// ── Authenticate with Google Sheets API ───────────────────────
function getSheetClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key || email.includes('your-service')) {
    console.warn('⚠️  Google Sheets not configured — skipping');
    return null;
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: key.replace(/\\n/g, '\n'),   // fix escaped newlines from .env
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.error('❌ Google Sheets auth error:', err.message);
    return null;
  }
}

// ── Ensure header row exists ──────────────────────────────────
async function ensureHeader(sheets, sheetId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:K1',
    });
    const rows = res.data.values || [];
    if (rows.length === 0 || rows[0][0] !== 'Booking ID') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'Booking ID', 'Guest Name', 'Email', 'Phone',
            'Date', 'Time', 'Guests', 'Occasion',
            'Special Requests', 'Status', 'Created At'
          ]],
        },
      });
    }
  } catch (err) {
    console.error('❌ Header check failed:', err.message);
  }
}

// ── Append booking row ────────────────────────────────────────
async function appendBookingToSheet(booking) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId || sheetId.includes('your_google')) {
    console.log('📊 Google Sheets skipped — not configured');
    return { logged: false, reason: 'Not configured' };
  }

  const sheets = getSheetClient();
  if (!sheets) return { logged: false, reason: 'Auth failed' };

  try {
    await ensureHeader(sheets, sheetId);

    const row = [
      booking.bookingId || '',
      booking.customerName || '',
      booking.email || '',
      booking.phone || '',
      booking.date || '',
      booking.time || '',
      booking.people || '',
      booking.occasion || '',
      booking.specialRequests || '',
      booking.status || 'confirmed',
      new Date(booking.createdAt || Date.now()).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:K',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    console.log(`📊 Booking ${booking.bookingId} logged to Google Sheets`);
    return { logged: true };
  } catch (err) {
    console.error('❌ Sheets append failed:', err.message);
    return { logged: false, reason: err.message };
  }
}

// ── Update booking status in sheet ───────────────────────────
async function updateBookingStatusInSheet(bookingId, newStatus) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId || sheetId.includes('your_google')) return;

  const sheets = getSheetClient();
  if (!sheets) return;

  try {
    // Find the row with this booking ID
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:A',
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === bookingId);
    if (rowIndex === -1) return;

    // Update status column (J = column 10, 1-indexed)
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Sheet1!J${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[newStatus]] },
    });
    console.log(`📊 Sheet updated: ${bookingId} → ${newStatus}`);
  } catch (err) {
    console.error('❌ Sheet update failed:', err.message);
  }
}

module.exports = { appendBookingToSheet, updateBookingStatusInSheet };
