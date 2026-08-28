# TradeLens — Changelog

All changes listed in reverse chronological order (newest first).

---

## 2026-08-28

### feat(sync): local MT5 sync agent for hosted deployments
- **Problem**: `MetaTrader5` is Windows-only with no Linux wheel and only talks to a terminal on the same machine — a hosted backend (e.g. Render) can never reach a user's MT5 terminal directly
- **New**: standalone `agent/tradelens_agent.py` — run on the PC where the MT5 terminal lives; logs into TradeLens once (JWT cached at `%USERPROFILE%\.tradelens\config.json`, password never stored), reads closed deal history, pushes it to the backend
- Supports `--watch MINUTES` for periodic re-sync, or Windows Task Scheduler for unattended runs
- **Backend**: new `POST /api/import/mt5/ingest` endpoint (`app/api/routes/imports.py`) accepts the agent's JSON payload (`IngestRequest`/`IngestResponse` in new `app/schemas/sync.py`)
- Refactored `mt5_service.py`: extracted `process_synced_deals(db, user_id, account_dict, deal_dicts)` — package-agnostic trade-reconstruction logic shared by both the new ingest route and the existing local-dev `sync_mt5_trades` path
- `mt5` import in `mt5_service.py` now defensive (`try/except ImportError`) so the backend doesn't crash on hosts without the package; `MetaTrader5`/`numpy` removed from `backend/requirements.txt` accordingly
- New `Account.last_synced_at` column (migration `b2c3d4e5f6a7`), returned by `GET /api/accounts`
- **Frontend**: Dashboard shows "Last synced: Xm/h/d ago" (`formatRelativeTime` in `format.ts`), a post-sync success message, and an ⓘ tooltip pointing hosted users to the agent
- **Known gap**: trade-detail candlestick chart (`GET /api/trades/{id}/chart`) still calls MT5 directly and doesn't work against a hosted backend — separate follow-up

---

## 2026-03-25

### feat(charting): chart timeframe switcher on trade detail
- **Backend**: `GET /api/trades/{id}/chart` now accepts `?timeframe=` (M1, M5, M15, H1, H4, D1)
- Lookback window auto-scales per timeframe (M1 → 2h, M5 → 8h, M15 → 12h, H1 → 4d, H4 → 16d, D1 → 60d) for ~80 candles of context each side
- MT5 timeframe mapped via `TIMEFRAME_M1` / `TIMEFRAME_H4` / etc. constants; response includes `timeframe` field
- **Frontend**: Compact button-row switcher (M1 · M5 · M15 · H1 · H4 · D1) in the Chart Review card header
- React Query key includes timeframe — switching refetches immediately; loading message shows selected timeframe

---

### feat(analytics): session performance breakdown
- **Backend**: `GET /api/analytics/by-session` — aggregates closed trades by `session` field (asia / london / new_york / overlap / other / untagged)
- **Frontend**: New `SessionBreakdownChart` component — 4 session summary cards (Asia/London/NY/Overlap) + horizontal P&L bars + stats table
- Each session has its own colour theme (yellow=Asia, blue=London, purple=NY, emerald=Overlap)
- Added to bottom of Analytics page

---

### feat(accounts): multi-account selection system
- **Backend**: New `GET /api/accounts` (list all), `GET /api/accounts/active` (current), `PUT /api/accounts/{id}/select` (switch)
- All `/api/analytics/*` and `GET /api/trades` endpoints now accept optional `?account_id=UUID`; fall back to the active account when omitted
- Active account persisted via `is_active` flag on the `accounts` table
- **Frontend**: New `AccountSwitcher` dropdown in the header — shows broker initials avatar, name, account number, currency badge
- Zustand store extended with `activeAccount` + `loadActiveAccount()`; all query keys include `accountId` so charts auto-refetch on account switch
- `TradeCalendar` and `DayTradesPanel` both propagate `accountId` down the component tree

---

### feat(trades): filter bar on table view
- **Backend**: `GET /api/trades` now accepts `symbol` (partial match), `side` (buy/sell), `strategy_tag` (partial match), `date_from`, `date_to`
- **Frontend**: New collapsible `TradeFilterBar` component — Symbol text input, All/Long/Short toggle, Strategy input, From/To date pickers
- Shows **Active** badge and trade count when any filter is set; "Clear all" button resets all filters
- Filter bar appears only in Table view (not Calendar)

---

### feat(analytics): day-of-week performance breakdown
- **Backend**: New `GET /api/analytics/by-dow` endpoint — aggregates closed trades by weekday (Mon–Sun), returns P&L, trade count, win rate, avg R
- **Frontend**: New `DayOfWeekChart` component — proportional green/red bar per day + stats table below (trades, win %, net P&L, avg R)
- Added to the bottom of the Analytics page, respects active account

---


## 2026-03-13

### feat(ux): comprehensive mobile responsive overhaul
- **AppLayout**: sticky header, hamburger dropdown on mobile, bottom tab bar with emoji icons + active indicator
- **TradesTable**: card-based list view on mobile (`< sm`), full data table on desktop
- **Calendar**: compact cells on mobile (only P&L shown), weekly sidebar replaced by horizontal scrollable strip below grid
- **DayTradesPanel**: full-screen on mobile (`inset-0`), pinned right rail on desktop (`max-w-md`)
- **DashboardPage**: header wraps on mobile, Sync button shrinks to icon-only on small screens
- **TradeDetailPage**: heading font scales down, layout already single-column below `lg`
- Global: main content padding reduced on mobile (`px-4`), bottom padding added for bottom nav bar

---

### fix(calendar): align weekly sidebar to calendar grid rows
- Rewrote week grouping to build the same cell grid as the frontend (Sunday-start, 7-cell rows)
- Always produces exactly one sidebar entry per calendar row — even for empty weeks
- Previous ordinal-based calculation mismatched the grid count

---

### fix(format): remove "US" prefix from currency display
- Changed `Intl.NumberFormat` locale from `en-GB` to `en-US`
- `US$1,234.56` → `$1,234.56` everywhere

---

### feat(calendar): trade drilldown on day click
- Clicking a calendar day opens `DayTradesPanel` slide-over
- Panel fetches trades for that date via `GET /api/trades?date=YYYY-MM-DD`
- Each trade card shows symbol, side badge, P&L, entry/exit, lot size, RR, timestamps
- Clicking a trade closes the panel and navigates to full trade detail
- Tap backdrop or ✕ to close

---

### feat(trades): trade calendar view
- New `GET /api/analytics/calendar?year&month` endpoint
- New `TradeCalendar` component: Sun–Sat grid, today highlighted, green/red day cells
- Monthly stats header (total P&L pill + days traded)
- Weekly totals sidebar (P&L + days per week)
- Prev/Next month navigation, "This month" shortcut
- Toggle between Calendar and Table view on Trades page

---

### chore: add start.ps1 startup script
- Created `start.ps1` at project root
- Kills stale `python`/`node` processes before starting
- Opens backend with **auto-restart loop** in its own PowerShell window
- Opens frontend in a separate PowerShell window
- Prints URLs on launch

---

### fix(backend): strip broker suffixes from symbol names
- `sym.symbol.split(".")[0]` removes `.raw`, `.pro`, `.ecn` etc.
- `EURUSD.raw` → `EURUSD` in all API responses

---

### fix(backend): add python-multipart dependency
- Installed `python-multipart` — required by FastAPI for `UploadFile` handling
- Added to `requirements.txt`

---

### feat(trades): show symbol name on trades list page
- `list_trades` endpoint now calls `_trade_with_symbol()` helper
- Previously returned raw SQLAlchemy model with no `symbol_name`
- Symbol column now populated in both list and detail views

---

### feat(journal): interactive trade journal with text + screenshots
**Backend**
- `PATCH /api/trades/{id}/journal` — saves note text to `note_summary` column
- `POST /api/trades/{id}/journal/images` — uploads screenshot to `uploads/{trade_id}/`
- `DELETE /api/trades/{id}/journal/images/{filename}` — removes a screenshot
- Mounted `/uploads` as a FastAPI `StaticFiles` route
- Created `uploads/` directory automatically on startup

**Frontend**
- New `JournalEditor` component with:
  - Textarea for post-trade notes + **Save Notes** button
  - Drag-and-drop + click-to-upload screenshot zone
  - Image gallery grid with hover-reveal **delete** and **fullscreen** buttons
- Replaced read-only journal text in `TradeDetailPage` with fully interactive editor
- Added `saveJournalNotes`, `uploadJournalImage`, `deleteJournalImage` to `api.ts`

---

### feat(trades): show what was traded — symbol badge + column
**Backend**
- `get_trade` and `list_trades` return `symbol_name` joined from `symbols` table
- Added `symbol_name` and `journal_images` fields to `TradeDetailResponse` schema
- Added `JournalUpdateRequest` Pydantic model

**Frontend**
- `symbol_name` added to `TradeListItem` TypeScript type
- **Symbol column** added to `TradesTable` (green monospace font)
- **Symbol + side badge** shown in `TradeDetailPage` header above trade title

---

### feat(trades): clickable rows + real MT5 candlestick chart on trade detail
**Clickable rows**
- `TradesTable` uses `useNavigate` — clicking anywhere on a row navigates to detail
- `cursor-pointer` applied to all rows with hover highlight

**Candlestick chart**
- `GET /api/trades/{id}/chart` — fetches M15 OHLC bars from MT5 for ±12h around trade
- New `TradeCandlestickChart` component using `lightweight-charts`
  - 🔵 Blue solid line = Entry price
  - 🟢/🔴 Coloured solid line = Exit price
  - 🔴 Dashed line = Stop Loss
  - 🟢 Dashed line = Take Profit
  - Arrow markers on candles at exact entry/exit time
- Chart shown at top of right column in `TradeDetailPage`
- Price level ladder and distance indicators remain below chart

---

### feat(dashboard): comprehensive analytics overhaul
**Backend — new endpoints**
- `GET /api/analytics/summary` — extended stats: avg win/loss, largest win/loss, max consec wins/losses, max drawdown, expectancy, long/short count, profit factor
- `GET /api/analytics/equity` — equity curve points + drawdown curve (both UNIX timestamps)
- `GET /api/analytics/monthly` — per-month: profit, R-multiple, win/loss/BE counts
- `GET /api/analytics/by-symbol` — net P&L, trade count, win rate per symbol

**Frontend — new components**
- `TradeDonutChart` — Win / Loss / B/E donut (Recharts)
- `LongShortDonutChart` — Long vs Short donut (Recharts)
- `MonthlyBarChart` — monthly P&L bar chart, green/red per month
- `SymbolBarChart` — horizontal bar chart of P&L by currency pair
- `DrawdownChart` — red area chart of % drawdown over time (lightweight-charts)
- `MonthlyStatsTable` — Month | Profit | R-Multiple | Win | Loss | B/E + totals row
- `SummaryCard` — enhanced with `positive`/`negative` colour props

**Dashboard page redesign**
- Account Summary row: Broker, Currency, Net P&L, Gross Profit/Loss, Win Rate
- Account Statistics row: Avg Win/Loss, Largest Win/Loss, Max Consec, Drawdown, Expectancy, Profit Factor, Avg RR, Total Trades
- Donut charts + Equity Curve row
- Monthly P&L bar + Drawdown chart row
- Performance by Symbol bar chart
- Monthly stats table

**Trade Detail page redesign**
- P&L hero card (green/red background)
- Execution info panel
- P&L breakdown panel (gross, commission, swap, fees, net)
- Risk stats panel (SL, TP, planned vs actual RR)

**Analytics page**
- Performance by symbol table + SymbolBarChart + MonthlyBarChart

---

### feat: rename app to TradeLens
- Updated `<title>` in `index.html`
- Updated nav header in `AppLayout.tsx`
- Updated `app_name` in `config.py` and `.env`
- Updated README files

---
