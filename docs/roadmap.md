# TradeLens — Roadmap

Current status: **v0.3 in progress — filters, day-of-week analytics, multi-account**

---

## ✅ Done (v0.1 — Core MVP)

- [x] FastAPI backend with PostgreSQL
- [x] MT5 integration — sync all closed trades
- [x] Dashboard with equity curve, account summary, win rate, P&L
- [x] Trade donut charts (Win / Loss / B/E, Long / Short)
- [x] Monthly P&L bar chart + monthly stats table
- [x] Performance by symbol bar chart
- [x] Account drawdown chart
- [x] Extended account statistics (avg win/loss, max drawdown, expectancy, profit factor, avg RR)
- [x] Trades list with symbol, side, entry/exit, P&L, RR, strategy
- [x] Clickable trade rows → trade detail page
- [x] Trade detail: M15 candlestick chart from MT5 with entry/exit arrows + SL/TP price lines
- [x] Trade detail: price level ladder + risk/reward distances
- [x] Trade detail: P&L breakdown (gross, commission, swap, fees)
- [x] Interactive journal — text notes (persisted to DB)
- [x] Interactive journal — screenshot upload with drag-and-drop + gallery
- [x] Symbol broker suffix stripping (EURUSD.raw → EURUSD)
- [x] `start.ps1` — one-command launch with backend auto-restart
- [x] Docs: CHANGELOG, architecture, api-notes, roadmap generated

## ✅ Done (v0.2 — Calendar + UX Polish)

- [x] Trade Calendar view — monthly grid with daily P&L, trade count, R-multiple, win rate
- [x] Calendar day click → slide-over panel showing all trades for that day
- [x] Weekly totals sidebar aligned exactly to calendar grid rows
- [x] Date filter on `/api/trades` endpoint (`?date=YYYY-MM-DD`)
- [x] Symbol displayed in trades list and trade detail header (without broker suffix)
- [x] Currency display: `$` sign only (no `US$`)
- [x] Table ↔ Calendar view toggle on Trades page
- [x] Full mobile responsive overhaul:
  - Hamburger menu + mobile bottom tab bar
  - Trade cards on mobile (no horizontal scroll)
  - Calendar compact cells + horizontal week strip on mobile
  - DayTradesPanel full-screen on mobile
  - Trade detail single-column on mobile
  - Dashboard header + sync button adapts to mobile

---

## 🔜 Planned (v0.3)

### Trade Tagging (High Value)
- [x] Add/edit `strategy_tag`, `setup_tag`, `session` directly from the trade detail page UI
- [x] Filter trades calendar/table by tag, symbol, side, date range
- [ ] Bulk-tag multiple trades from table view

### Analytics Improvements
- [x] Day-of-week performance breakdown (best/worst trading days)
- [x] Session breakdown (London / New York / Asia / Overlap)
- [ ] R-multiple distribution histogram
- [ ] Consecutive win/loss streak visualisation
- [ ] Risk-adjusted return metrics (Sharpe, Calmar ratio)
- [ ] Heatmap calendar showing P&L intensity (like GitHub contribution graph)

### Charting
- [x] Switch chart timeframe (M1, M5, M15, H1, H4, D1) from trade detail page
- [ ] Overlay multiple trades on the same chart (shared symbol)
- [ ] Trade replay mode (candle-by-candle playback)

### Journal
- [ ] Rich text editor (bold, italic, lists, links)
- [ ] Image region annotation / markup tool
- [ ] Export journal entry as PDF

### Import / Sync
- [x] Local sync agent for hosted deployments (`agent/tradelens_agent.py` → `POST /api/import/mt5/ingest`), since hosted backends can't reach a user's local MT5 terminal
- [ ] Trade-detail candlestick chart working against a hosted backend (currently local-MT5-only, same root cause as above — needs the agent to also serve/cache OHLC data, or a hosted market-data source)
- [ ] Import from CSV (MT4, cTrader, Tradovate)
- [ ] Scheduled auto-sync (background task every N minutes) — agent currently supports client-side `--watch`, not server-driven
- [ ] Open trade tracking with real-time P&L

---

## 🔮 Future (v1.0)

- [x] Multi-account support with account switcher
- [ ] Shared read-only dashboard links (share performance with others)
- [ ] Progressive Web App (PWA) — installable on phone
- [ ] AI trade review — pattern analysis, weakness identification, coaching tips
- [ ] Push notifications — equity drawdown alerts, daily summary
- [ ] Broker-agnostic connector (OANDA API, cTrader API, FIX protocol)
