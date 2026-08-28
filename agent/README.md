# TradeLens Sync Agent

Pushes your closed MT5 trade history to a hosted TradeLens backend. Run this
on the **same PC where your MT5 terminal is installed and logged in** — the
MetaTrader5 Python package only talks to a terminal on the same machine, so
this can't run on the hosted server itself.

## Setup

```bash
cd agent
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## First run

```bash
python tradelens_agent.py --base-url https://your-backend.onrender.com/api
```

You'll be prompted for your TradeLens username and password once. The API
base URL and username are cached at `%USERPROFILE%\.tradelens\config.json`
(your password is never written to disk); the login token is cached there
too and refreshed automatically when it expires.

`--base-url` should be the same value as the frontend's `VITE_API_URL`
(it already includes the `/api` suffix).

## Ongoing sync

One-off sync (e.g. run manually whenever you want fresh data):

```bash
python tradelens_agent.py
```

Or keep it running and re-sync automatically every 15 minutes:

```bash
python tradelens_agent.py --watch 15
```

## Running automatically via Windows Task Scheduler

To sync periodically without keeping a terminal window open:

1. Open **Task Scheduler** → **Create Task**.
2. **Triggers**: "At log on", and set it to repeat every 15 minutes
   indefinitely.
3. **Actions**: Start a program —
   - Program: `C:\path\to\agent\venv\Scripts\python.exe`
   - Arguments: `tradelens_agent.py`
   - Start in: `C:\path\to\agent`

Since the agent needs to log in once interactively to cache a token, run it
manually one time first before relying on the scheduled task.

## Options

| Flag | Description |
|---|---|
| `--base-url` | TradeLens API base URL |
| `--username` | TradeLens username |
| `--password` | TradeLens password (omit to be prompted; never stored on disk) |
| `--from-days` | Days of trade history to sync each run (default 365) |
| `--watch MINUTES` | Loop, re-syncing every N minutes, instead of a single run |

## Known limitation

Chart data (candlestick view on the trade-detail page) also currently
depends on a local MT5 terminal and does not yet work against a hosted
backend — that's a separate follow-up, not covered by this agent.
