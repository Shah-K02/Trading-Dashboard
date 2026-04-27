# TradeLens — API Notes

Base URL: `http://localhost:8000`  
All API routes are prefixed with `/api`.

---

## Authentication
None — the app is designed for single-user local use.

---

## Accounts

### `GET /api/accounts`
Returns all known trading accounts (auto-created on MT5 sync).

**Response** — array of:
```json
{
  "id": "uuid",
  "broker_name": "ACG Markets Limited",
  "account_name": "Alpha Capital Group",
  "account_number": "2575403",
  "server_name": "ACGMarkets-Live",
  "base_currency": "USD",
  "leverage": "100",
  "is_active": true
}
```

---

### `GET /api/accounts/active`
Returns the currently selected account. Falls back to the first account if none is flagged active.

---

### `PUT /api/accounts/{account_id}/select`
Marks the given account as active (deactivates all others). Returns the updated account object.

---

## Analytics

> All analytics endpoints accept an optional `?account_id=UUID` query param.  
> When omitted, the active account is used automatically.

### `GET /api/analytics/summary`
Returns full account statistics for all closed trades.

**Response**
```json
{
  "total_trades": 42,
  "winning_trades": 25,
  "losing_trades": 15,
  "breakeven_trades": 2,
  "win_rate": 0.595,
  "total_net_pnl": 1240.50,
  "gross_profit": 2100.00,
  "gross_loss": 859.50,
  "profit_factor": 2.44,
  "average_win": 84.00,
  "average_loss": -57.30,
  "largest_win": 320.00,
  "largest_loss": -180.00,
  "max_consec_wins": 6,
  "max_consec_losses": 4,
  "max_drawdown_pct": 12.4,
  "max_drawdown_abs": 540.00,
  "expectancy": 35.80,
  "average_planned_rr": 2.1,
  "average_actual_rr": 1.74,
  "long_trades": 28,
  "short_trades": 14,
  "account_currency": "USD",
  "broker_name": "ACG Markets Limited"
}
```

---

### `GET /api/analytics/equity`
Returns equity curve and drawdown curve data points.

**Response**
```json
{
  "points":   [{ "time": 1739000000, "value": 120.50 }, ...],
  "drawdown": [{ "time": 1739000000, "value": -4.20 }, ...]
}
```
> `time` is a UNIX timestamp (seconds). Use directly with `lightweight-charts`.

---

### `GET /api/analytics/monthly`
Returns per-month P&L aggregation.

**Response**
```json
[
  {
    "month": "Jan 26",
    "profit": 420.00,
    "r_multiple": 3.4,
    "winning_trades": 8,
    "losing_trades": 3,
    "be_trades": 1
  }
]
```

---

### `GET /api/analytics/by-symbol`
Returns P&L broken down by currency pair, sorted by net P&L descending.

**Response**
```json
[
  { "symbol": "EURUSD", "net_pnl": 640.00, "trades": 18, "win_rate": 66.7 },
  { "symbol": "GBPJPY", "net_pnl": -120.00, "trades": 8, "win_rate": 37.5 }
]
```

---

### `GET /api/analytics/calendar`
Returns per-day and per-week trade stats for a calendar month. Weeks are aligned to the frontend Sunday-start grid.

**Query params**: `year` (required), `month` (required, 1–12), `account_id` (optional UUID)

**Response**
```json
{
  "year": 2026,
  "month": 3,
  "days": {
    "2026-03-10": { "pnl": 180.50, "trades": 2, "win_rate": 100.0, "r_multiple": 3.6 }
  },
  "weeks": [
    { "week_num": 1, "pnl": 0.0,   "days": 0 },
    { "week_num": 2, "pnl": 180.50, "days": 1 }
  ],
  "total_pnl": 180.50,
  "total_days": 1
}
```

---

### `GET /api/analytics/by-dow`
Returns P&L aggregated by weekday (Monday through Sunday).

**Query params**: `account_id` (optional UUID)

**Response** — array of 7 items (Mon–Sun):
```json
[
  { "day": "Monday",  "short": "Mon", "net_pnl": 0.00,   "trades": 0, "win_rate": 0,    "avg_r": 0 },
  { "day": "Tuesday", "short": "Tue", "net_pnl": -442.00, "trades": 3, "win_rate": 33.3, "avg_r": 0 }
]
```

## Trades

### `GET /api/trades`
Returns paginated, filterable list of closed trades.

**Query params**:
| Param | Default | Description |
|---|---|---|
| `limit` | 50 | Max 200 |
| `offset` | 0 | Pagination offset |
| `account_id` | — | Filter by account UUID (falls back to active account) |
| `date` | — | Filter by single close date `YYYY-MM-DD` |
| `date_from` | — | Filter from date `YYYY-MM-DD` (close_time ≥) |
| `date_to` | — | Filter to date `YYYY-MM-DD` (close_time ≤ end of day) |
| `symbol` | — | Partial match on symbol name (case-insensitive) |
| `side` | — | Exact match: `buy` or `sell` |
| `strategy_tag` | — | Partial match on strategy tag (case-insensitive) |

**Response** — array of:
```json
{
  "id": "uuid",
  "symbol_name": "EURUSD",
  "side": "buy",
  "status": "closed",
  "open_time": "2026-03-01T08:30:00Z",
  "close_time": "2026-03-01T10:15:00Z",
  "entry_price": 1.08524,
  "exit_price": 1.08704,
  "lot_size": 0.1,
  "net_pnl": 180.00,
  "planned_rr": 2.0,
  "actual_rr": 1.8,
  "strategy_tag": "breakout"
}
```

---

### `GET /api/trades/{trade_id}`
Returns full detail for a single trade.

**Additional fields vs list:**
```json
{
  "stop_loss": 1.08400,
  "take_profit": 1.08900,
  "gross_pnl": 185.00,
  "commission": -3.50,
  "swap": -1.50,
  "fees": 0.00,
  "risk_amount": 80.00,
  "reward_amount": 160.00,
  "setup_tag": "london_session_break",
  "session": "london",
  "note_summary": "Clean break of structure...",
  "journal_images": ["/uploads/{trade_id}/abc123.png"],
  "symbol_name": "EURUSD"
}
```

---

### `GET /api/trades/{trade_id}/chart`
Returns M15 OHLC bars from MT5 covering ±12 hours around the trade, plus key price levels.

> **Requires MT5 to be running on the same machine.**

**Response**
```json
{
  "bars": [
    { "time": 1739000000, "open": 1.0850, "high": 1.0862, "low": 1.0848, "close": 1.0858 }
  ],
  "entry_price": 1.08524,
  "exit_price": 1.08704,
  "stop_loss": 1.08400,
  "take_profit": 1.08900,
  "open_time": 1739001800,
  "close_time": 1739009100,
  "side": "buy"
}
```

---

### `PATCH /api/trades/{trade_id}/journal`
Saves text notes for a trade.

**Request body**
```json
{ "note_summary": "Waited for the re-test, good patience." }
```

**Response**: `{ "ok": true }`

---

### `POST /api/trades/{trade_id}/journal/images`
Upload a screenshot to a trade's journal.

**Request**: `multipart/form-data` with field `file` (image only: JPEG, PNG, GIF, WebP)

**Response**
```json
{ "url": "/uploads/{trade_id}/abc123.png" }
```

> Images are served directly at `http://localhost:8000/uploads/{trade_id}/{filename}`

---

### `DELETE /api/trades/{trade_id}/journal/images/{filename}`
Deletes a specific journal screenshot from disk.

**Response**: `{ "ok": true }`

---

## Import

### `POST /api/import/mt5`
Triggers a sync from MetaTrader 5. Fetches all deals since account inception and upserts them as closed trades (no duplicates).

> **Requires MT5 to be running and logged in.**

**Response**
```json
{ "message": "MT5 import successful", "new_trades_count": 3 }
```

---

## Static Files

### `GET /uploads/{trade_id}/{filename}`
Serves uploaded journal screenshots directly. No `/api` prefix.

---

## Health

### `GET /health`
```json
{ "status": "ok" }
```
