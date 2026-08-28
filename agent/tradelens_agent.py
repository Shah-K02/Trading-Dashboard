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
from pathlib import Path

import requests

try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None

CONFIG_PATH = Path.home() / ".tradelens" / "config.json"

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
        print("Session expired, logging in again...")
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
    parser = argparse.ArgumentParser(description="TradeLens local MT5 sync agent")
    parser.add_argument("--base-url", help="TradeLens API base URL, e.g. https://your-backend.onrender.com/api")
    parser.add_argument("--username", help="TradeLens username")
    parser.add_argument("--password", help="TradeLens password (omit to be prompted; not stored on disk)")
    parser.add_argument("--from-days", type=int, default=365, help="How many days of history to sync (default 365)")
    parser.add_argument("--watch", type=int, metavar="MINUTES", help="Re-sync every N minutes instead of running once")
    args = parser.parse_args()

    config = load_config()
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

    def sync_once():
        try:
            result = run_once(config, args.from_days)
            print(f"Synced. New trades: {result['new_trades_count']}. Last synced: {result['last_synced_at']}")
        except Exception as e:
            print(f"Sync failed: {e}", file=sys.stderr)

    if args.watch:
        print(f"Watching — syncing every {args.watch} minute(s). Press Ctrl+C to stop.")
        while True:
            sync_once()
            time.sleep(args.watch * 60)
    else:
        sync_once()


if __name__ == "__main__":
    main()
