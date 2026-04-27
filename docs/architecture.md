# TradeLens — Architecture

## Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser  (React + Vite, localhost:5173)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Dashboard  │  │  Trades List │  │  Trade Detail      │  │
│  │  (charts,   │  │  (table +    │  │  (candlestick,    │  │
│  │  analytics) │  │   filters)   │  │   journal editor) │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST (axios)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Backend  (uvicorn, localhost:8000)                 │
│                                                             │
│  /api/analytics/*   /api/trades/*   /api/import/mt5        │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Services Layer                                        │ │
│  │  analytics_service.py  │  mt5_service.py              │ │
│  └───────────────┬────────────────────────────────────────┘ │
│                  │ SQLAlchemy ORM                            │
│  ┌───────────────▼────────────────────────────────────────┐ │
│  │  PostgreSQL  (localhost:5432, db: trading_dashboard)   │ │
│  │  tables: accounts, symbols, trades                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  On-machine: MetaTrader 5 (mt5.initialize() / copy_rates)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Layout

```
Trading Dashboard/
├── start.ps1               ← launch everything (run this)
├── CHANGELOG.md
│
├── backend/
│   ├── app/
│   │   ├── main.py         ← FastAPI app, mounts /uploads static
│   │   ├── core/
│   │   │   └── config.py   ← settings (APP_NAME, DB_URL, etc.)
│   │   ├── api/
│   │   │   ├── router.py
│   │   │   └── routes/
│   │   │       ├── analytics.py
│   │   │       ├── trades.py
│   │   │       └── imports.py
│   │   ├── models/
│   │   │   ├── account.py
│   │   │   ├── symbol.py
│   │   │   └── trade.py
│   │   ├── schemas/
│   │   │   └── trade.py    ← Pydantic schemas
│   │   ├── services/
│   │   │   ├── analytics_service.py
│   │   │   └── mt5_service.py
│   │   └── db/
│   │       └── session.py
│   ├── uploads/            ← trade journal screenshots (auto-created)
│   ├── setup_db.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   ├── EquityChart.tsx
│   │   │   │   ├── DrawdownChart.tsx
│   │   │   │   ├── TradeCandlestickChart.tsx
│   │   │   │   ├── TradeDonutChart.tsx
│   │   │   │   ├── LongShortDonutChart.tsx
│   │   │   │   ├── MonthlyBarChart.tsx
│   │   │   │   └── SymbolBarChart.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── SummaryCard.tsx
│   │   │   │   └── MonthlyStatsTable.tsx
│   │   │   ├── trades/
│   │   │   │   ├── TradesTable.tsx
│   │   │   │   └── JournalEditor.tsx
│   │   │   └── layout/
│   │   │       └── AppLayout.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── TradesPage.tsx
│   │   │   ├── TradeDetailPage.tsx
│   │   │   └── AnalyticsPage.tsx
│   │   └── lib/
│   │       ├── api.ts      ← all fetch functions
│   │       └── format.ts   ← formatCurrency, formatDateTime, etc.
│   └── index.html
│
└── docs/
    ├── architecture.md  ← this file
    ├── roadmap.md
    └── api-notes.md
```

---

## Data Flow — MT5 Sync

```
Browser                 Backend               MT5
   │                       │                   │
   │── POST /import/mt5 ──►│                   │
   │                       │── mt5.initialize()►│
   │                       │◄── account info ───│
   │                       │── copy_deals_range►│
   │                       │◄── RawDeal[] ──────│
   │                       │                   │
   │                       │  build Trade rows  │
   │                       │  upsert → Postgres │
   │                       │                   │
   │◄── { new_trades } ────│                   │
```

## Data Flow — Trade Chart

```
Browser                 Backend               MT5
   │                       │                   │
   │── GET /trades/{id}/chart ─►│               │
   │                       │── copy_rates_range►│
   │                       │◄── OHLC M15 bars ──│
   │                       │                   │
   │◄── { bars[], entry, exit, sl, tp } ────────│
```

---

## Database Schema (simplified)

```sql
accounts (id, broker_name, login, base_currency, leverage)

symbols  (id, account_id, symbol, description, pip_value)

trades   (id, account_id, symbol_id,
          side, status,
          open_time, close_time,
          entry_price, exit_price, stop_loss, take_profit,
          lot_size,
          gross_pnl, commission, swap, fees, net_pnl,
          planned_rr, actual_rr, risk_amount, reward_amount,
          strategy_tag, setup_tag, session,
          note_summary)
```
