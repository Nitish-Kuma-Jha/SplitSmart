# SplitSmart — Shared Expense Manager

> Built for the Spreetail Engineering Internship Assignment

A full-stack MERN application for tracking shared expenses with smart CSV import, anomaly detection, membership-aware splits, multi-currency support, and explainable balances.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd splitsmart

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/splitwise
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Email (for OTP verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

CLIENT_URL=http://localhost:5173
```

> **Gmail App Password**: Go to Google Account → Security → 2FA → App Passwords. Generate one for "Mail".

> **Dev mode**: If email is not configured, the OTP is returned in the API response body as `devOtp` and shown in a toast notification. No email needed for testing.

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run

```bash
# Terminal 1 — Backend
cd backend && npm start

# Terminal 2 — Frontend
cd frontend && npm run dev
```

App runs at: **http://localhost:5173**

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite (JSX) |
| Routing | React Router v6 |
| State | React Context + Axios |
| Charts | Recharts |
| Notifications | react-hot-toast |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs (12 salt rounds) |
| Email/OTP | Nodemailer |
| File Upload | Multer |
| CSV Parsing | csv-parser |
| Security | Helmet, express-rate-limit, CORS |

---

## 🏗️ Project Structure

```
splitsmart/
├── backend/
│   ├── models/
│   │   ├── User.js          # User with OTP fields
│   │   ├── Group.js         # Group + membership timeline
│   │   ├── Expense.js       # Expenses with splits
│   │   ├── Settlement.js    # Direct payments
│   │   ├── ImportJob.js     # CSV import tracking
│   │   ├── Anomaly.js       # Detected anomalies
│   │   └── AuditLog.js      # Full audit trail
│   ├── routes/
│   │   ├── auth.js          # Register, login, OTP, reset
│   │   ├── groups.js        # Groups, members, balances
│   │   ├── expenses.js      # CRUD expenses
│   │   ├── settlements.js   # CRUD settlements
│   │   ├── import.js        # CSV upload + anomaly engine
│   │   ├── reports.js       # Monthly/category analytics
│   │   └── ai.js            # Balance explainer + NLP queries
│   ├── middleware/
│   │   └── auth.js          # JWT protect middleware
│   └── utils/
│       └── email.js         # Nodemailer OTP emails
└── frontend/
    └── src/
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   └── layout/Sidebar.jsx
        └── pages/
            ├── Landing.jsx
            ├── auth/          # Login, Register, VerifyOtp, ForgotPassword
            ├── dashboard/     # Dashboard
            ├── groups/        # Groups, GroupDetail
            ├── expenses/      # Expenses, Settlements, Balances
            ├── import/        # ImportPage, ImportReview
            ├── reports/       # Reports
            └── ai/            # AiAssistant
```

---

## 🔐 Authentication Flow

1. User registers → OTP sent via Nodemailer
2. User enters 6-digit OTP → Email verified → JWT issued
3. All protected routes use `Authorization: Bearer <token>`
4. Passwords hashed with bcryptjs (12 salt rounds)
5. Forgot password → OTP reset flow

**Email Regex Used**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

**Password Requirements**: Min 8 chars, must contain uppercase + lowercase + digit

---

## 📥 CSV Import Flow

1. Upload `expenses_export.csv` via Import page
2. Backend parses CSV with `csv-parser`
3. Anomaly engine runs 12+ detection rules
4. Review page shows every anomaly with severity, description, suggested action
5. Admin approves/rejects each anomaly (or bulk approve)
6. Execute import — approved actions applied, import report generated

**Exchange rate**: 1 USD = ₹84 (hardcoded, documented)

---

## ⚖️ Balance Calculation

```
Net Balance = Total Paid - Total Share Owed + Settlements Received - Settlements Paid
```

Positive = person is owed money  
Negative = person owes money

**Debt Simplification** uses a greedy creditor/debtor matching algorithm:
- Sort debtors (negative balance) and creditors (positive balance)
- Match largest debtor to largest creditor
- Minimizes total number of transactions

---

## 🗄️ Database Schema

See `SCOPE.md` for full schema details.

---

## 🤖 AI Used

Claude (Anthropic) — see `AI_USAGE.md`

---

## 📄 Documentation Files

- `README.md` — This file
- `SCOPE.md` — All 12+ anomalies + database schema
- `DECISIONS.md` — Every key engineering decision
- `AI_USAGE.md` — AI prompts, mistakes caught, corrections made
