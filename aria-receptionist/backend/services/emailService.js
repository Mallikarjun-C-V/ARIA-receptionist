const nodemailer = require('nodemailer');

// ── Create transporter (lazy — only when first used) ─────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email not configured — EMAIL_USER / EMAIL_PASS missing in .env');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,   // Gmail App Password
    },
  });

  return transporter;
}

// ── HTML email template ───────────────────────────────────────
function buildConfirmationHTML(booking) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body { margin:0; padding:0; background:#04040f; font-family:'Segoe UI',Arial,sans-serif; }
    .wrap { max-width:560px; margin:0 auto; background:#0d0d20; border-radius:16px; overflow:hidden; }
    .header { background:linear-gradient(135deg,#7c6ff7,#a78bfa); padding:36px 32px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:28px; font-weight:300; letter-spacing:2px; }
    .header p  { color:rgba(255,255,255,0.7); margin:8px 0 0; font-size:13px; letter-spacing:3px; text-transform:uppercase; }
    .body { padding:32px; }
    .badge { background:rgba(45,212,191,0.1); border:1px solid rgba(45,212,191,0.3); border-radius:30px; padding:8px 20px; display:inline-block; margin-bottom:24px; }
    .badge span { color:#2dd4bf; font-size:12px; font-weight:600; letter-spacing:2px; text-transform:uppercase; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:20px 0; }
    .cell { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:14px 16px; }
    .cell-label { color:rgba(255,255,255,0.35); font-size:10px; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px; }
    .cell-value { color:#fff; font-size:14px; font-weight:500; }
    .note { background:rgba(124,111,247,0.08); border:1px solid rgba(124,111,247,0.2); border-radius:10px; padding:16px; margin-top:20px; }
    .note p { color:rgba(255,255,255,0.5); font-size:12px; margin:0; line-height:1.6; }
    .footer { border-top:1px solid rgba(255,255,255,0.06); padding:20px 32px; text-align:center; }
    .footer p { color:rgba(255,255,255,0.2); font-size:11px; margin:4px 0; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>The Velvet Room</h1>
    <p>Reservation Confirmed</p>
  </div>
  <div class="body">
    <div class="badge"><span>✅ Your table is booked</span></div>
    <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.7;margin:0 0 20px;">
      Dear ${booking.customerName}, your reservation at <strong style="color:#fff">The Velvet Room</strong> has been confirmed. We look forward to welcoming you.
    </p>
    <div class="grid">
      <div class="cell">
        <div class="cell-label">📅 Date</div>
        <div class="cell-value">${booking.date}</div>
      </div>
      <div class="cell">
        <div class="cell-label">🕐 Time</div>
        <div class="cell-value">${booking.time}</div>
      </div>
      <div class="cell">
        <div class="cell-label">👥 Guests</div>
        <div class="cell-value">${booking.people} ${booking.people === 1 ? 'guest' : 'guests'}</div>
      </div>
      <div class="cell">
        <div class="cell-label">🔖 Booking ID</div>
        <div class="cell-value">${booking.bookingId}</div>
      </div>
      ${booking.occasion ? `
      <div class="cell">
        <div class="cell-label">🎉 Occasion</div>
        <div class="cell-value">${booking.occasion}</div>
      </div>` : ''}
      ${booking.specialRequests ? `
      <div class="cell" style="grid-column:1/-1;">
        <div class="cell-label">📝 Special Requests</div>
        <div class="cell-value">${booking.specialRequests}</div>
      </div>` : ''}
    </div>
    <div class="note">
      <p>📍 47 Marina Boulevard, San Francisco, CA 94123<br/>
      📞 (415) 555-0192 &nbsp;·&nbsp; Smart casual dress code<br/>
      🚗 Valet parking available from 5:30 PM</p>
    </div>
  </div>
  <div class="footer">
    <p>The Velvet Room · Modern European</p>
    <p>To modify or cancel: call (415) 555-0192 or reply to this email</p>
  </div>
</div>
</body>
</html>`;
}

function buildReminderHTML(booking) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { margin:0; padding:0; background:#04040f; font-family:'Segoe UI',Arial,sans-serif; }
    .wrap { max-width:560px; margin:0 auto; background:#0d0d20; border-radius:16px; overflow:hidden; }
    .header { background:linear-gradient(135deg,#2dd4bf,#0d9488); padding:36px 32px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:26px; font-weight:300; letter-spacing:2px; }
    .header p  { color:rgba(255,255,255,0.7); margin:8px 0 0; font-size:13px; }
    .body { padding:32px; }
    .big-time { text-align:center; background:rgba(45,212,191,0.08); border:1px solid rgba(45,212,191,0.25); border-radius:14px; padding:24px; margin:20px 0; }
    .big-time .t { color:#2dd4bf; font-size:40px; font-weight:700; }
    .big-time .d { color:rgba(255,255,255,0.5); font-size:14px; margin-top:6px; }
    .footer { border-top:1px solid rgba(255,255,255,0.06); padding:20px 32px; text-align:center; }
    .footer p { color:rgba(255,255,255,0.2); font-size:11px; margin:4px 0; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>⏰ Your Reservation is Now!</h1>
    <p>The Velvet Room — Time to head over</p>
  </div>
  <div class="body">
    <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.7;margin:0 0 16px;">
      Dear <strong style="color:#fff">${booking.customerName}</strong>, your table at <strong style="color:#fff">The Velvet Room</strong> is ready right now. We are expecting you!
    </p>
    <div class="big-time">
      <div class="t">${booking.time}</div>
      <div class="d">${booking.date} · ${booking.people} ${booking.people === 1 ? 'guest' : 'guests'} · Booking ${booking.bookingId}</div>
    </div>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.7;">
      📍 47 Marina Boulevard, San Francisco<br/>
      🚗 Valet available at the entrance<br/>
      📞 (415) 555-0192 if you're running late
    </p>
  </div>
  <div class="footer">
    <p>The Velvet Room · Modern European</p>
    <p>We hope you have a wonderful evening ✦</p>
  </div>
</div>
</body>
</html>`;
}

// ── Send confirmation email ───────────────────────────────────
async function sendConfirmationEmail(booking) {
  const t = getTransporter();
  if (!t) {
    console.log('📧 Email skipped — not configured');
    return { sent: false, reason: 'Email not configured' };
  }
  if (!booking.email) {
    console.log('📧 Email skipped — no email address on booking');
    return { sent: false, reason: 'No email address' };
  }

  try {
    const info = await t.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'The Velvet Room'}" <${process.env.EMAIL_USER}>`,
      to: booking.email,
      subject: `✅ Reservation Confirmed — ${booking.date} at ${booking.time} | The Velvet Room`,
      html: buildConfirmationHTML(booking),
    });
    console.log(`📧 Confirmation email sent to ${booking.email} — messageId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

// ── Send reminder email ───────────────────────────────────────
async function sendReminderEmail(booking) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'Email not configured' };
  if (!booking.email) return { sent: false, reason: 'No email address' };

  try {
    const info = await t.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'The Velvet Room'}" <${process.env.EMAIL_USER}>`,
      to: booking.email,
      subject: `⏰ Your Table is Ready Now — ${booking.time} | The Velvet Room`,
      html: buildReminderHTML(booking),
    });
    console.log(`📧 Reminder email sent to ${booking.email}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Reminder email failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendConfirmationEmail, sendReminderEmail };
