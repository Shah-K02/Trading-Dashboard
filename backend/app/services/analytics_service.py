from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.trade import Trade
from app.models.account import Account
from app.models.symbol import Symbol
from datetime import datetime, timezone
from collections import defaultdict
import uuid


def _base_query(db: Session, account_id: uuid.UUID | None = None):
    q = db.query(Trade).filter(Trade.status == "closed")
    if account_id:
        q = q.filter(Trade.account_id == account_id)
    return q


def get_full_summary(db: Session, account_id: uuid.UUID | None = None) -> dict:
    trades = _base_query(db, account_id).order_by(Trade.close_time.asc()).all()

    # Account info
    account = None
    if account_id:
        account = db.query(Account).filter(Account.id == account_id).first()
    else:
        account = db.query(Account).first()

    if not trades:
        return {
            "total_trades": 0, "winning_trades": 0, "losing_trades": 0, "breakeven_trades": 0,
            "win_rate": 0, "total_net_pnl": 0, "gross_profit": 0, "gross_loss": 0,
            "profit_factor": 0, "average_win": 0, "average_loss": 0,
            "largest_win": 0, "largest_loss": 0, "max_consec_wins": 0, "max_consec_losses": 0,
            "max_drawdown_pct": 0, "max_drawdown_abs": 0, "expectancy": 0,
            "average_planned_rr": 0, "average_actual_rr": 0, "long_trades": 0, "short_trades": 0,
            "account_balance": 0, "account_currency": "USD", "broker_name": "",
        }

    winners = [t for t in trades if float(t.net_pnl) > 0]
    losers  = [t for t in trades if float(t.net_pnl) < 0]
    be      = [t for t in trades if float(t.net_pnl) == 0]

    gross_profit = sum(float(t.net_pnl) for t in winners)
    gross_loss   = abs(sum(float(t.net_pnl) for t in losers))
    total_pnl    = sum(float(t.net_pnl) for t in trades)

    win_rate       = len(winners) / len(trades)
    profit_factor  = gross_profit / gross_loss if gross_loss else 0
    avg_win        = gross_profit / len(winners) if winners else 0
    avg_loss       = gross_loss   / len(losers)  if losers  else 0
    largest_win    = max((float(t.net_pnl) for t in winners), default=0)
    largest_loss   = min((float(t.net_pnl) for t in losers),  default=0)
    expectancy     = (win_rate * avg_win) - ((1 - win_rate) * avg_loss)

    # Consecutive wins/losses
    max_cw = max_cl = cw = cl = 0
    for t in trades:
        if float(t.net_pnl) > 0:
            cw += 1; cl = 0
        else:
            cl += 1; cw = 0
        max_cw = max(max_cw, cw)
        max_cl = max(max_cl, cl)

    # Max drawdown
    peak = equity = 0.0
    max_dd_abs = max_dd_pct = 0.0
    for t in trades:
        equity += float(t.net_pnl)
        if equity > peak:
            peak = equity
        dd_abs = peak - equity
        dd_pct = (dd_abs / peak * 100) if peak > 0 else 0
        if dd_abs > max_dd_abs:
            max_dd_abs = dd_abs
            max_dd_pct = dd_pct

    planned_rrs = [float(t.planned_rr) for t in trades if t.planned_rr]
    actual_rrs  = [float(t.actual_rr)  for t in trades if t.actual_rr]

    long_count  = sum(1 for t in trades if t.side == "buy")
    short_count = sum(1 for t in trades if t.side == "sell")

    return {
        "total_trades":       len(trades),
        "winning_trades":     len(winners),
        "losing_trades":      len(losers),
        "breakeven_trades":   len(be),
        "win_rate":           win_rate,
        "total_net_pnl":      total_pnl,
        "gross_profit":       gross_profit,
        "gross_loss":         gross_loss,
        "profit_factor":      profit_factor,
        "average_win":        avg_win,
        "average_loss":       -avg_loss,
        "largest_win":        largest_win,
        "largest_loss":       largest_loss,
        "max_consec_wins":    max_cw,
        "max_consec_losses":  max_cl,
        "max_drawdown_pct":   max_dd_pct,
        "max_drawdown_abs":   max_dd_abs,
        "expectancy":         expectancy,
        "average_planned_rr": sum(planned_rrs) / len(planned_rrs) if planned_rrs else 0,
        "average_actual_rr":  sum(actual_rrs)  / len(actual_rrs)  if actual_rrs  else 0,
        "long_trades":        long_count,
        "short_trades":       short_count,
        "account_balance":    0,  # TODO: fetch live balance via MT5 account_info()
        "account_currency":   account.base_currency if account else "USD",
        "broker_name":        account.broker_name if account else "",
    }


def get_equity_curve(db: Session, account_id: uuid.UUID | None = None) -> dict:
    trades = _base_query(db, account_id).order_by(Trade.close_time.asc()).all()

    equity_points = []
    current_equity = 0.0
    peak = 0.0
    drawdown_points = []

    for trade in trades:
        current_equity += float(trade.net_pnl)
        if current_equity > peak:
            peak = current_equity
        dd_pct = -((peak - current_equity) / peak * 100) if peak > 0 else 0

        ts = int(trade.close_time.timestamp())
        equity_points.append({"time": ts, "value": round(current_equity, 2)})
        drawdown_points.append({"time": ts, "value": round(dd_pct, 4)})

    return {"points": equity_points, "drawdown": drawdown_points}


def get_monthly_stats(db: Session, account_id: uuid.UUID | None = None) -> list:
    trades = _base_query(db, account_id).order_by(Trade.close_time.asc()).all()

    monthly: dict = defaultdict(lambda: {"profit": 0.0, "r_total": 0.0, "wins": 0, "losses": 0, "be": 0})

    for t in trades:
        key = t.close_time.strftime("%b %y") if t.close_time else "Unknown"
        monthly[key]["profit"] += float(t.net_pnl)
        if t.actual_rr:
            monthly[key]["r_total"] += float(t.actual_rr)
        if float(t.net_pnl) > 0:
            monthly[key]["wins"]   += 1
        elif float(t.net_pnl) < 0:
            monthly[key]["losses"] += 1
        else:
            monthly[key]["be"]     += 1

    return [
        {
            "month":   k,
            "profit":  round(v["profit"], 2),
            "r_multiple": round(v["r_total"], 2),
            "winning_trades": v["wins"],
            "losing_trades":  v["losses"],
            "be_trades":      v["be"],
        }
        for k, v in monthly.items()
    ]


def get_symbol_breakdown(db: Session, account_id: uuid.UUID | None = None) -> list:
    trades = _base_query(db, account_id).all()

    sym_map: dict = defaultdict(lambda: {"pnl": 0.0, "trades": 0, "wins": 0})

    all_symbols = {str(s.id): s.symbol for s in db.query(Symbol).all()}

    for t in trades:
        sym = all_symbols.get(str(t.symbol_id), "Unknown")
        sym_map[sym]["pnl"]    += float(t.net_pnl)
        sym_map[sym]["trades"] += 1
        if float(t.net_pnl) > 0:
            sym_map[sym]["wins"] += 1

    return [
        {
            "symbol":    k,
            "net_pnl":   round(v["pnl"], 2),
            "trades":    v["trades"],
            "win_rate":  round(v["wins"] / v["trades"] * 100, 1) if v["trades"] else 0,
        }
        for k, v in sorted(sym_map.items(), key=lambda x: x[1]["pnl"], reverse=True)
    ]


def get_calendar_data(db: Session, year: int, month: int, account_id: uuid.UUID | None = None) -> dict:
    """Return per-day and per-week trade stats for the given calendar month."""
    import calendar as cal_mod
    from datetime import date, timedelta

    first_day = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day_num = cal_mod.monthrange(year, month)[1]
    last_day = datetime(year, month, last_day_num, 23, 59, 59, tzinfo=timezone.utc)

    trades = (
        db.query(Trade)
        .filter(
            Trade.status == "closed",
            Trade.close_time >= first_day,
            Trade.close_time <= last_day,
            *([Trade.account_id == account_id] if account_id else []),
        )
        .order_by(Trade.close_time.asc())
        .all()
    )

    # Group by day
    daily: dict = defaultdict(lambda: {"pnl": 0.0, "trades": 0, "wins": 0, "r_total": 0.0})
    for t in trades:
        day = t.close_time.strftime("%Y-%m-%d")
        daily[day]["pnl"]    += float(t.net_pnl)
        daily[day]["trades"] += 1
        if float(t.net_pnl) > 0:
            daily[day]["wins"] += 1
        if t.actual_rr:
            daily[day]["r_total"] += float(t.actual_rr)

    days_result = {
        day: {
            "pnl":        round(v["pnl"], 2),
            "trades":     v["trades"],
            "win_rate":   round(v["wins"] / v["trades"] * 100, 1) if v["trades"] else 0,
            "r_multiple": round(v["r_total"], 2),
        }
        for day, v in daily.items()
    }

    # Build week labels aligned exactly to the calendar grid rows
    # (same logic as the frontend: Sunday=0, Monday=1, ... Saturday=6)
    from datetime import date
    first_date = date(year, month, 1)
    # weekday() returns Mon=0 .. Sun=6, convert to Sun=0 .. Sat=6
    first_dow = (first_date.weekday() + 1) % 7

    # Build cells list: None padding + day numbers (same as calendarGrid in TS)
    cells: list = [None] * first_dow + list(range(1, last_day_num + 1))
    while len(cells) % 7 != 0:
        cells.append(None)

    # Split into rows of 7 and compute per-row stats
    week_labels: list = []
    for row_idx in range(0, len(cells), 7):
        row = cells[row_idx:row_idx + 7]
        row_pnl   = 0.0
        row_days  = 0
        for day_num in row:
            if day_num is None:
                continue
            key = f"{year}-{month:02d}-{day_num:02d}"
            if key in days_result:
                row_pnl  += days_result[key]["pnl"]
                row_days += 1
        week_labels.append({
            "week_num": len(week_labels) + 1,
            "pnl":      round(row_pnl, 2),
            "days":     row_days,
        })

    return {
        "year":       year,
        "month":      month,
        "days":       days_result,
        "weeks":      week_labels,
        "total_pnl":  round(sum(v["pnl"] for v in days_result.values()), 2),
        "total_days": len(days_result),
    }


DOW_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def get_dow_breakdown(db: Session, account_id: uuid.UUID | None = None) -> list:
    """Return per day-of-week aggregated trade stats."""
    trades = _base_query(db, account_id).order_by(Trade.close_time.asc()).all()

    buckets: dict = defaultdict(lambda: {"pnl": 0.0, "trades": 0, "wins": 0, "r_total": 0.0})

    for t in trades:
        if not t.close_time:
            continue
        dow = t.close_time.weekday()  # 0=Mon … 6=Sun
        buckets[dow]["pnl"]    += float(t.net_pnl)
        buckets[dow]["trades"] += 1
        if float(t.net_pnl) > 0:
            buckets[dow]["wins"] += 1
        if t.actual_rr:
            buckets[dow]["r_total"] += float(t.actual_rr)

    return [
        {
            "day":        DOW_NAMES[i],
            "short":      DOW_NAMES[i][:3],
            "net_pnl":    round(buckets[i]["pnl"], 2),
            "trades":     buckets[i]["trades"],
            "win_rate":   round(buckets[i]["wins"] / buckets[i]["trades"] * 100, 1) if buckets[i]["trades"] else 0,
            "avg_r":      round(buckets[i]["r_total"] / buckets[i]["trades"], 2) if buckets[i]["trades"] else 0,
        }
        for i in range(7)
    ]


SESSION_LABELS = {
    "asia":     "🌏 Asia",
    "london":   "🇬🇧 London",
    "new_york": "🗽 New York",
    "overlap":  "🔀 Overlap",
    "other":    "Other",
    "":         "Untagged",
}
SESSION_ORDER = ["asia", "london", "new_york", "overlap", "other", ""]


def get_session_breakdown(db: Session, account_id: uuid.UUID | None = None) -> list:
    """Return per-session (Asia / London / New York / Overlap / Other) aggregated stats."""
    trades = _base_query(db, account_id).order_by(Trade.close_time.asc()).all()

    buckets: dict = defaultdict(lambda: {"pnl": 0.0, "trades": 0, "wins": 0, "r_total": 0.0})

    for t in trades:
        key = (t.session or "").lower().strip()
        if key not in SESSION_LABELS:
            key = ""
        buckets[key]["pnl"]    += float(t.net_pnl)
        buckets[key]["trades"] += 1
        if float(t.net_pnl) > 0:
            buckets[key]["wins"] += 1
        if t.actual_rr:
            buckets[key]["r_total"] += float(t.actual_rr)

    return [
        {
            "session":  key,
            "label":    SESSION_LABELS[key],
            "net_pnl":  round(buckets[key]["pnl"], 2),
            "trades":   buckets[key]["trades"],
            "win_rate": round(buckets[key]["wins"] / buckets[key]["trades"] * 100, 1) if buckets[key]["trades"] else 0,
            "avg_r":    round(buckets[key]["r_total"] / buckets[key]["trades"], 2) if buckets[key]["trades"] else 0,
        }
        for key in SESSION_ORDER
        if buckets[key]["trades"] > 0 or key in ("asia", "london", "new_york", "overlap")
    ]
