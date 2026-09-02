"""TradeLens local sync agent.

Runs on the same PC as a logged-in MetaTrader 5 terminal (MT5's Python API
only works via local IPC to a terminal on the same machine, so this cannot
run on the hosted server itself). Fetches closed-trade history from MT5 and
pushes it to a hosted TradeLens backend via POST /import/mt5/ingest.

Usage:
    python tradelens_agent.py --base-url https://your-backend.onrender.com/api
    python tradelens_agent.py --watch 15   # re-sync every 15 minutes
"""

import argparse
import getpass
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None

CONFIG_PATH = Path.home() / ".tradelens" / "config.json"
LOG_PATH = Path.home() / ".tradelens" / "agent.log"


def _setup_logging() -> None:
    """Tee stdout/stderr to a log file. Required for running under pythonw.exe
    (no console window, e.g. via Task Scheduler) — there sys.stdout/sys.stderr
    are None, and a bare print() would crash the process."""
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    log_file = open(LOG_PATH, "a", encoding="utf-8", buffering=1)

    class _Tee:
        def __init__(self, *streams):
            self.streams = [s for s in streams if s is not None]

        def write(self, data):
            for s in self.streams:
                try:
                    s.write(data)
                except Exception:
                    pass

        def flush(self):
            for s in self.streams:
                try:
                    s.flush()
                except Exception:
                    pass

    sys.stdout = _Tee(sys.stdout, log_file)
    sys.stderr = _Tee(sys.stderr, log_file)


def log(msg: str, err: bool = False) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", file=sys.stderr if err else sys.stdout)

# Mirrors the backend's own per-timeframe lookback window
# (backend/app/api/routes/trades.py _WINDOW) so cached chart bars cover the
# same range the trade-detail page requests.
CHART_TIMEFRAMES = {
    "M1":  ("TIMEFRAME_M1", 2 * 3600),
    "M5":  ("TIMEFRAME_M5", 8 * 3600),
    "M15": ("TIMEFRAME_M15", 12 * 3600),
    "H1":  ("TIMEFRAME_H1", 4 * 86400),
    "H4":  ("TIMEFRAME_H4", 16 * 86400),
    "D1":  ("TIMEFRAME_D1", 60 * 86400),
}


def load_config() -> dict:
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text())
    return {}


def save_config(config: dict) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    # Never persist the password, only the base_url/username/token.
    to_save = {k: v for k, v in config.items() if k != "password"}
    CONFIG_PATH.write_text(json.dumps(to_save, indent=2))


def login(base_url: str, username: str, password: str) -> str:
    resp = requests.post(
        f"{base_url}/auth/login",
        json={"username": username, "password": password},
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Login failed ({resp.status_code}): {resp.text}")
    return resp.json()["access_token"]


def fetch_deals(from_days: int):
    if mt5 is None:
        raise RuntimeError("MetaTrader5 package is not installed. Run: pip install -r requirements.txt")

    if not mt5.initialize():
        raise RuntimeError(f"Failed to initialize MT5. Ensure the terminal is running. Error: {mt5.last_error()}")

    account_info = mt5.account_info()
    if account_info is None:
        mt5.shutdown()
        raise RuntimeError("Failed to get MT5 account info. Are you logged in to the terminal?")

    from datetime import datetime, timezone, timedelta
    to_date = datetime.now(timezone.utc)
    from_date = to_date - timedelta(days=from_days)

    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        deals = []

    account_payload = {
        "login": account_info.login,
        "company": account_info.company,
        "name": account_info.name,
        "server": account_info.server,
        "currency": account_info.currency,
        "leverage": account_info.leverage,
    }
    deal_payloads = [{
        "position_id": d.position_id,
        "order_id": d.order,
        "deal_id": d.ticket,
        "entry": d.entry,
        "type": d.type,
        "price": d.price,
        "volume": d.volume,
        "profit": d.profit,
        "commission": d.commission,
        "swap": d.swap,
        "fee": d.fee,
        "time": d.time,
        "symbol": d.symbol,
    } for d in deals]

    mt5.shutdown()
    return account_payload, deal_payloads


def check_sync_requested(base_url: str, token: str) -> bool:
    """Polls the request-sync flag the hosted dashboard's "Sync MT5" button
    sets. Best-effort: network hiccups here just mean we wait for the next
    scheduled sync instead of crashing the watch loop."""
    try:
        resp = requests.get(
            f"{base_url}/import/mt5/sync-status",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        if resp.status_code != 200:
            return False
        return bool(resp.json().get("requested"))
    except requests.RequestException:
        return False


def ingest(base_url: str, token: str, account_payload: dict, deal_payloads: list) -> requests.Response:
    return requests.post(
        f"{base_url}/import/mt5/ingest",
        headers={"Authorization": f"Bearer {token}"},
        json={"account": account_payload, "deals": deal_payloads},
        timeout=60,
    )


def fetch_chart_bars(symbol: str, open_time: int, close_time: int) -> list[dict]:
    """Fetch OHLC bars for every chart timeframe around a trade's open/close
    time, so the hosted backend can serve the candlestick chart without
    reaching MT5 itself. Returns [] entries are skipped by the caller."""
    from datetime import datetime, timezone, timedelta

    charts = []
    for tf_name, (tf_attr, window_secs) in CHART_TIMEFRAMES.items():
        tf_const = getattr(mt5, tf_attr)
        window = timedelta(seconds=window_secs)
        from_dt = datetime.fromtimestamp(open_time, tz=timezone.utc) - window
        to_dt = datetime.fromtimestamp(close_time, tz=timezone.utc) + window
        rates = mt5.copy_rates_range(symbol, tf_const, from_dt, to_dt)
        if rates is None or len(rates) == 0:
            continue
        bars = [{
            "time": int(r["time"]), "open": float(r["open"]), "high": float(r["high"]),
            "low": float(r["low"]), "close": float(r["close"]),
        } for r in rates]
        charts.append({"timeframe": tf_name, "bars": bars})
    return charts


def push_chart_data(base_url: str, token: str, new_trades: list) -> None:
    """For each trade the backend just created, fetch and push chart bars.
    Best-effort: chart data isn't critical, so failures here don't fail the sync."""
    if mt5 is None or not new_trades:
        return

    if not mt5.initialize():
        print(f"Chart fetch skipped: could not reinitialize MT5 ({mt5.last_error()})", file=sys.stderr)
        return

    try:
        charts_payload = []
        for t in new_trades:
            for chart in fetch_chart_bars(t["symbol"], t["open_time"], t["close_time"]):
                charts_payload.append({
                    "trade_id": t["trade_id"],
                    "timeframe": chart["timeframe"],
                    "bars": chart["bars"],
                })
    finally:
        mt5.shutdown()

    if not charts_payload:
        return

    resp = requests.post(
        f"{base_url}/import/mt5/charts",
        headers={"Authorization": f"Bearer {token}"},
        json={"charts": charts_payload},
        timeout=120,
    )
    if resp.status_code != 200:
        print(f"Chart push failed ({resp.status_code}): {resp.text}", file=sys.stderr)


def run_once(config: dict, from_days: int) -> dict:
    base_url = config["base_url"]
    account_payload, deal_payloads = fetch_deals(from_days)

    resp = ingest(base_url, config["token"], account_payload, deal_payloads)
    if resp.status_code == 401:
        log("Session expired, logging in again...")
        password = config.get("password") or getpass.getpass(f"Password for {config['username']}: ")
        config["token"] = login(base_url, config["username"], password)
        save_config(config)
        resp = ingest(base_url, config["token"], account_payload, deal_payloads)

    if resp.status_code != 200:
        raise RuntimeError(f"Ingest failed ({resp.status_code}): {resp.text}")

    result = resp.json()
    push_chart_data(base_url, config["token"], result.get("new_trades", []))
    return result


def main():
    _setup_logging()
    parser = argparse.ArgumentParser(description="TradeLens local MT5 sync agent")
    parser.add_argument("--base-url", help="TradeLens API base URL, e.g. https://your-backend.onrender.com/api")
    parser.add_argument("--username", help="TradeLens username")
    parser.add_argument("--password", help="TradeLens password (omit to be prompted; not stored on disk)")
    parser.add_argument("--from-days", type=int, default=365, help="Days of history for the very first sync (default 365)")
    parser.add_argument("--resync-from-days", type=int, default=7, help="Days of history for every sync after the first (default 7) — narrower window since older trades are already synced; keeps repeated syncs (--watch, or a Task Scheduler run every N minutes) cheap")
    parser.add_argument("--watch", type=int, metavar="MINUTES", help="Re-sync every N minutes instead of running once")
    parser.add_argument("--poll-seconds", type=int, default=20, help="In --watch mode, how often to check for an on-demand sync request from the dashboard's Sync button (default 20)")
    args = parser.parse_args()

    config = load_config()
    had_token_before = "token" in config  # i.e. this isn't the very first time this account has ever synced
    if args.base_url:
        config["base_url"] = args.base_url
    if args.username:
        config["username"] = args.username
    if args.password:
        config["password"] = args.password

    if "base_url" not in config:
        config["base_url"] = input("TradeLens API base URL: ").strip()
    if "username" not in config:
        config["username"] = input("TradeLens username: ").strip()
    if "token" not in config:
        password = config.get("password") or getpass.getpass(f"Password for {config['username']}: ")
        config["token"] = login(config["base_url"], config["username"], password)

    save_config(config)

    def sync_once(from_days: int):
        try:
            result = run_once(config, from_days)
            log(f"Synced. New trades: {result['new_trades_count']}. Last synced: {result['last_synced_at']}")
        except Exception as e:
            log(f"Sync failed: {e}", err=True)

    if args.watch:
        log(f"Watching — syncing every {args.watch} minute(s), checking for on-demand "
            f"sync requests every {args.poll_seconds}s. Logging to {LOG_PATH}.")
        first_tick = True
        last_sync_time = 0.0
        while True:
            now = time.time()
            due_for_scheduled_sync = first_tick or (now - last_sync_time >= args.watch * 60)
            requested = False if due_for_scheduled_sync else check_sync_requested(config["base_url"], config["token"])

            if due_for_scheduled_sync or requested:
                if requested:
                    log("On-demand sync requested from the dashboard — syncing now.")
                use_full_history = first_tick and not had_token_before
                sync_once(args.from_days if use_full_history else args.resync_from_days)
                last_sync_time = time.time()
                first_tick = False

            time.sleep(args.poll_seconds)
    else:
        use_full_history = not had_token_before
        sync_once(args.from_days if use_full_history else args.resync_from_days)


if __name__ == "__main__":
    main()
