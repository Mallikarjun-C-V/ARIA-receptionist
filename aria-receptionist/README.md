# ARIA — Autonomous Voice AI Receptionist v2.0

Voice AI receptionist with **email notifications**, **Google Sheets logging**, and **reservation reminders**.

---

## 🚀 Quick Start

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys (see below)
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in Chrome.

---

## ⚙️ Environment Variables

### Required
```
GEMINI_API_KEY=         # https://aistudio.google.com/app/apikey (free)
MONGODB_URI=            # mongodb://localhost:27017/aria_receptionist
```

### Email (Gmail + App Password)
```
EMAIL_USER=your@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx   # 16-char App Password
```
**How to get App Password:**
1. Google Account → Security → 2-Step Verification → App Passwords
2. Select "Mail" → Generate → copy the 16-char code

### Google Sheets
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=   # from service account JSON
GOOGLE_PRIVATE_KEY=             # from service account JSON
GOOGLE_SHEET_ID=                # from sheet URL
```
**How to set up:**
1. console.cloud.google.com → New project → Enable "Google Sheets API"
2. IAM → Service Accounts → Create → Download JSON key
3. Create Google Sheet → Share with service account email (Editor)
4. Copy Sheet ID from URL: `.../spreadsheets/d/SHEET_ID/edit`

---

## 📧 Email Features
- **Instant confirmation** — sent immediately after booking
- **Reservation reminder** — sent at exact reservation time (cron runs every minute)
- Both emails are beautiful HTML with The Velvet Room branding

## 📊 Google Sheets
- Every booking auto-logged with all details
- Cancellations update status column automatically
- Headers auto-created on first run

## 🎙️ Voice Flow
Speak → Speech-to-text → Gemini AI → Book/Cancel/Check → MongoDB + Email + Sheets → Voice reply

---

## 📋 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat | Send message to AI |
| GET | /api/bookings | All bookings |
| POST | /api/bookings | Create booking |
| PATCH | /api/bookings/:id/cancel | Cancel booking |
| GET | /api/bookings/stats | Stats |
| GET | /api/availability | Check slots |
| GET | /health | Server status |
