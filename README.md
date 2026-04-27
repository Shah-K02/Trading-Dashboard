# TradeLens 📊

> A **MetaTrader 5** trade analytics and journaling dashboard — built with FastAPI + React.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.116-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)](https://www.postgresql.org/)

---

## ✨ Features

- 🔐 **User auth** — Register & login with JWT tokens; your data is private to you
- 📥 **MT5 sync** — One-click import of your closed trade history from MetaTrader 5
- 📊 **Dashboard** — Equity curve, drawdown, win rate, profit factor, avg RR and more
- 📅 **Calendar view** — Browse your trading activity day-by-day
- 🔍 **Trade detail** — Candlestick chart review with entry/exit markers at multiple timeframes
- 📓 **Trade journal** — Add notes and screenshot uploads per trade
- 📈 **Analytics** — Session, day-of-week, and symbol breakdown charts
- 📱 **Responsive** — Works on desktop and mobile

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy 2, PostgreSQL |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Migrations | Alembic |
| Frontend | React 18, TypeScript, Vite |
| State | Zustand, TanStack Query |
| Charts | Recharts, lightweight-charts |
| Styling | Tailwind CSS |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- MetaTrader 5 (for live sync; optional if you only want to explore)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/trading-dashboard.git
cd trading-dashboard
```

### 2. Set up the backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate      # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and generate a SECRET_KEY:
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Create the database

```bash
# In PostgreSQL, create a database:
psql -U postgres -c "CREATE DATABASE trading_dashboard;"

# Run migrations (creates all tables including users)
alembic upgrade head
```

### 4. Set up the frontend

```bash
cd ../frontend
npm install
cp .env.example .env    # or create with: echo "VITE_API_URL=http://localhost:8000/api" > .env
```

### 5. Run the application

```powershell
# From the project root (Windows)
.\start.ps1
```

Or separately:

```bash
# Backend
cd backend && uvicorn app.main:app --port 8000 --reload

# Frontend (in another terminal)
cd frontend && npm run dev
```

Open **http://localhost:5173** and register your account.

---

## 📁 Project Structure

```
trading-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routes (auth, accounts, trades, analytics)
│   │   ├── core/         # Config, security, path constants
│   │   ├── db/           # SQLAlchemy session
│   │   ├── models/       # ORM models (User, Account, Trade, Symbol)
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic (MT5 sync, analytics)
│   ├── migrations/       # Alembic migration scripts
│   ├── tests/            # pytest test suite
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/   # Reusable UI components
    │   ├── lib/          # API client, store, formatters
    │   └── pages/        # Route-level page components
    ├── .env.example
    └── package.json
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SECRET_KEY` | JWT signing key (run `python -c "import secrets; print(secrets.token_hex(32))"`) | ✅ |
| `APP_DEBUG` | Enable debug mode (`true`/`false`) | — |
| `ALLOWED_ORIGINS_STR` | Comma-separated allowed frontend URLs | — |
| `MT5_LOGIN` | MT5 account number (optional) | — |
| `MT5_PASSWORD` | MT5 password (optional) | — |
| `MT5_SERVER` | MT5 broker server (optional) | — |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:8000/api`) |

---

## 🔒 Security Notes

- Passwords are hashed with **bcrypt** — never stored in plain text
- JWTs expire after **7 days**
- Each user's data is fully **isolated** — you can only see your own accounts and trades
- API docs (`/docs`) are **disabled** in production (`APP_DEBUG=false`)
- Never commit your `.env` file — it's in `.gitignore`

---

## 📝 License

MIT — feel free to fork and adapt for your own trading analysis.
