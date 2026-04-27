# API Blueprint

## Import
- `POST /api/import/mt5`
  - Pull historical MT5 trades
  - Future body: `account_id`, `from`, `to`

## Trades
- `GET /api/trades?limit=50&offset=0`
- `GET /api/trades/{trade_id}`

## Analytics
- `GET /api/analytics/summary`
- `GET /api/analytics/equity`

## Recommended next routes
- `GET /api/analytics/by-symbol`
- `GET /api/analytics/by-session`
- `GET /api/analytics/by-weekday`
- `POST /api/trades/{trade_id}/notes`
- `POST /api/trades/{trade_id}/tags`
