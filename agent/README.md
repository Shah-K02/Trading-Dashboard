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

In `--watch` mode the agent also checks every 20 seconds (`--poll-seconds`)
for an on-demand sync request from the dashboard's "Sync MT5" button, so
clicking it on a hosted deployment triggers a sync almost immediately
instead of waiting for the next scheduled interval — see "Triggering a sync
from the dashboard" below.

## Running automatically via Windows Task Scheduler

To sync continuously without keeping a terminal window open:

1. Open **Task Scheduler** → **Create Task**.
2. **Triggers**: "At log on" only (no repetition — the agent repeats itself
   via `--watch`).
3. **Actions**: Start a program —
   - Program: `C:\path\to\agent\venv\Scripts\pythonw.exe`
   - Arguments: `tradelens_agent.py --watch 15`
   - Start in: `C:\path\to\agent`
4. **Settings**: set **"Stop the task if it runs longer than"** to
   **disabled/unchecked** (Task Scheduler defaults this to 3 days, and older
   defaults to as little as 5 minutes — either will silently kill a
   long-running `--watch` process).

Since the agent needs to log in once interactively to cache a token, run it
manually one time first (with `python.exe`, not `pythonw.exe`, so you can see
the prompts) before relying on the scheduled task.

**Use `pythonw.exe`, not `python.exe`, for the scheduled task.** `python.exe`
opens a visible console window — closing it (even by accident) kills the
agent, since a webpage can never restart a program on your machine for you
(browsers block that for security reasons). `pythonw.exe` runs the exact same
script with no window at all, so there's nothing to accidentally close; it
just keeps running in the background until you log off or explicitly stop
the task. Since it has no console, all output goes to a log file instead —
see below.

## Logs

Because `pythonw.exe` has no console, the agent always writes its status
(sync results, errors, on-demand sync requests) to
`%USERPROFILE%\.tradelens\agent.log`, in addition to the console when one is
attached. Check this file if syncs seem to have stopped — the most likely
cause is the cached login token expiring after 7 days when the process has
been running headless the whole time. It can't prompt for a password with no
console attached, and — this was tested directly, since a blocking prompt
with nothing to read from would otherwise hang the *entire* watch loop
forever, silently, with no further syncs at all — it now detects that case
and fails fast instead of hanging: you'll see `Sync failed: Cannot prompt for
<username>'s password: no console attached...` in the log, repeating every
cycle. Just run `python tradelens_agent.py` once manually (not `pythonw`) to
re-authenticate.

## Triggering a sync from the dashboard

On a hosted deployment, clicking "Sync MT5" can't sync directly (the server
has no MT5 terminal to talk to). Instead it flags a sync request; the agent
picks it up on its next poll (every 20s while running with `--watch`) and
syncs immediately, using the narrower `--resync-from-days` window. The
dashboard polls for completion and refreshes automatically once the agent
finishes. If the agent isn't running, the request just sits there until it
next starts up or its next scheduled sync happens anyway.

## Options

| Flag | Description |
|---|---|
| `--base-url` | TradeLens API base URL |
| `--username` | TradeLens username |
| `--password` | TradeLens password (omit to be prompted; never stored on disk) |
| `--from-days` | Days of history for the very first sync (default 365) |
| `--resync-from-days` | Days of history for every sync after the first (default 7) |
| `--watch MINUTES` | Loop, re-syncing every N minutes, instead of a single run |

The narrower `--resync-from-days` window applies automatically to any sync
after the first one this account has ever done (detected by whether a login
token was already cached) — so a fresh Task Scheduler-triggered run every 15
minutes, or the 2nd+ tick of `--watch`, only asks MT5 for the last 7 days of
deals instead of re-fetching and re-sending the full year every time. Older
trades are already synced and get skipped server-side regardless, but a
smaller window keeps each sync's MT5 call and network payload small.

## Chart data

The agent also pushes candlestick chart bars (all timeframes: M1–D1) for
every newly-synced trade, via `POST /import/mt5/charts`, so the trade-detail
chart works against a hosted backend without it needing to reach MT5 itself.

**Known limitation**: this only happens for trades the agent *just* created —
trades that were already synced before you started using the agent won't have
cached chart data. There's currently no way to backfill chart data for old
trades short of re-syncing from a fresh account (a manual DB wipe + re-run).
