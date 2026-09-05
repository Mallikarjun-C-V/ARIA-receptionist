# ARIA — Autonomous Voice AI Receptionist

```
aria-receptionist/
├── backend/     → Node.js API server          (port 5000)
├── frontend/    → User-facing React app        (port 5173)
└── admin/       → Staff admin React app        (port 5174)
```

---

## 🚀 Quick Start

### Terminal 1 — Backend
```bash
cd backend
npm install
cp .env.example .env        # fill in your keys
npm run dev
```

### Terminal 2 — Frontend (User app)
```bash
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

### Terminal 3 — Admin (Staff only)
```bash
cd admin
npm install
npm run dev
# open http://localhost:5174
```

---

## 🔑 Environment Setup

### backend/.env (required keys)
```
GEMINI_API_KEY=       # https://aistudio.google.com/app/apikey  (free)
MONGODB_URI=          # mongodb://localhost:27017/aria_receptionist
ADMIN_USERNAME=your-username
ADMIN_PASSWORD=your-password
JWT_SECRET=change_me_to_random_string
```

### Admin login
- URL: http://localhost:5174
- Username: value of ADMIN_USERNAME in backend/.env
- Password: value of ADMIN_PASSWORD in backend/.env

---

## 🪑 Restaurant Capacity Logic
- **5 tables** total
- **Max 10 guests** per table (one booking per table)
- **3 seatings** per evening: 5:00 PM · 7:00 PM · 9:00 PM
- Maximum 5 bookings per time slot (one per table)
- Bookings over 10 guests are rejected (suggest calling directly)

---

## 📧 Optional — Email Notifications
```
EMAIL_USER=your@gmail.com
EMAIL_PASS=16-char-app-password    # Google Account → Security → App Passwords
```
- Instant confirmation email on booking
- Reminder email at exact reservation time (cron, every minute)

## 📊 Optional — Google Sheets Logging
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
```

---

## 📋 API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Server health |
| POST | /api/chat | AI conversation |
| GET | /api/bookings | All bookings |
| POST | /api/admin/login | Admin login → JWT |
| GET | /api/admin/bookings | Bookings (auth) |
| GET | /api/admin/capacity | Table map (auth) |
| GET | /api/admin/stats | Stats (auth) |
| PATCH | /api/admin/bookings/:id/cancel | Cancel (auth) |
