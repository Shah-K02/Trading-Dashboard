from uuid import UUID
from datetime import timezone, timedelta
from pathlib import Path
import shutil, uuid as uuid_lib

from fastapi import APIRouter, Depends, Query, HTTPException, File, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.paths import UPLOAD_DIR, MAX_UPLOAD_BYTES
from app.db.session import get_db
from app.models.account import Account
from app.models.trade import Trade
from app.models.symbol import Symbol
from app.models.user import User
from app.schemas.trade import TradeDetailResponse, TradeListItem, JournalUpdateRequest

router = APIRouter()


def _trade_with_symbol(trade: Trade, db: Session) -> dict:
    sym = db.query(Symbol).filter(Symbol.id == trade.symbol_id).first()
    d = {c.name: getattr(trade, c.name) for c in trade.__table__.columns}
    d["symbol_name"] = sym.symbol.split(".")[0] if sym else None
    # Gather saved images for this trade
    img_dir = UPLOAD_DIR / str(trade.id)
    if img_dir.exists():
        d["journal_images"] = [f"/uploads/{trade.id}/{f.name}" for f in sorted(img_dir.iterdir())]
    else:
        d["journal_images"] = []
    return d


def _resolve_account_id(db: Session, account_id: UUID | None, user_id: UUID) -> UUID | None:
    """Return the provided account_id (validated to belong to user), or fall back to active."""
    if account_id:
        acc = db.query(Account).filter(
            Account.id == account_id, Account.user_id == user_id
        ).first()
        return acc.id if acc else None
    active = db.query(Account).filter(
        Account.user_id == user_id, Account.is_active == True
    ).first()
    if not active:
        active = db.query(Account).filter(Account.user_id == user_id).first()
    return active.id if active else None


@router.get("")
def list_trades(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    date: str = Query(default=None, description="Filter by close date YYYY-MM-DD"),
    account_id: UUID | None = Query(default=None),
    symbol: str | None = Query(default=None, description="Filter by symbol name (partial match)"),
    side: str | None = Query(default=None, description="Filter by side: buy | sell"),
    strategy_tag: str | None = Query(default=None, description="Filter by strategy tag (partial match)"),
    date_from: str | None = Query(default=None, description="Filter from date YYYY-MM-DD (close_time)"),
    date_to: str | None = Query(default=None, description="Filter to date YYYY-MM-DD (close_time)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timezone as tz
    resolved_account_id = _resolve_account_id(db, account_id, current_user.id)
    q = db.query(Trade)
    if resolved_account_id:
        q = q.filter(Trade.account_id == resolved_account_id)
    else:
        # No accounts for this user yet
        return []

    if date:
        start = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=tz.utc)
        end = start.replace(hour=23, minute=59, second=59)
        q = q.filter(Trade.close_time >= start, Trade.close_time <= end)
    if date_from:
        dt_from = datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=tz.utc)
        q = q.filter(Trade.close_time >= dt_from)
    if date_to:
        dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=tz.utc)
        q = q.filter(Trade.close_time <= dt_to)
    if side and side in ("buy", "sell"):
        q = q.filter(Trade.side == side)
    if strategy_tag:
        q = q.filter(Trade.strategy_tag.ilike(f"%{strategy_tag}%"))
    if symbol:
        all_symbols = {s.id: s.symbol for s in db.query(Symbol).all()}
        matching_ids = [sid for sid, sym in all_symbols.items() if symbol.lower() in sym.lower()]
        if matching_ids:
            q = q.filter(Trade.symbol_id.in_(matching_ids))
        else:
            return []

    trades = q.order_by(Trade.open_time.desc()).offset(offset).limit(limit).all()
    return [_trade_with_symbol(t, db) for t in trades]


@router.get("/{trade_id}", response_model=TradeDetailResponse)
def get_trade(
    trade_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    # Ensure trade belongs to this user via account
    acc = db.query(Account).filter(
        Account.id == trade.account_id, Account.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _trade_with_symbol(trade, db)


@router.patch("/{trade_id}/journal")
def update_journal(
    trade_id: UUID,
    payload: JournalUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    acc = db.query(Account).filter(
        Account.id == trade.account_id, Account.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=403, detail="Forbidden")
    if payload.note_summary is not None:
        trade.note_summary = payload.note_summary
    db.commit()
    return {"ok": True}


@router.patch("/{trade_id}/tags")
def update_tags(
    trade_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update strategy_tag, setup_tag, session on a trade."""
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    acc = db.query(Account).filter(
        Account.id == trade.account_id, Account.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=403, detail="Forbidden")

    VALID_SESSIONS = {"asia", "london", "new_york", "overlap", "other", ""}

    if "strategy_tag" in payload:
        trade.strategy_tag = payload["strategy_tag"] or None
    if "setup_tag" in payload:
        trade.setup_tag = payload["setup_tag"] or None
    if "session" in payload:
        sess = payload["session"] or ""
        if sess and sess not in VALID_SESSIONS:
            raise HTTPException(status_code=400, detail=f"Invalid session value: {sess}")
        trade.session = sess or None

    from datetime import datetime, timezone
    trade.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"ok": True, "strategy_tag": trade.strategy_tag, "setup_tag": trade.setup_tag, "session": trade.session}


@router.post("/{trade_id}/journal/images")
async def upload_journal_image(
    trade_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    acc = db.query(Account).filter(
        Account.id == trade.account_id, Account.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=403, detail="Forbidden")

    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 10 MB)")

    img_dir = UPLOAD_DIR / str(trade_id)
    img_dir.mkdir(exist_ok=True)

    ext = Path(file.filename or "img.png").suffix or ".png"
    fname = f"{uuid_lib.uuid4()}{ext}"
    dest = img_dir / fname
    dest.write_bytes(contents)

    return {"url": f"/uploads/{trade_id}/{fname}"}


@router.delete("/{trade_id}/journal/images/{filename}")
def delete_journal_image(
    trade_id: UUID,
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    acc = db.query(Account).filter(
        Account.id == trade.account_id, Account.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=403, detail="Forbidden")
    img_path = UPLOAD_DIR / str(trade_id) / filename
    if img_path.exists():
        img_path.unlink()
    return {"ok": True}


@router.get("/{trade_id}/chart")
def get_trade_chart(
    trade_id: UUID,
    timeframe: str = Query(default="M15", description="Chart timeframe: M1, M5, M15, H1, H4, D1"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch OHLC bars from MT5 for the trade's symbol between open and close time."""
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    acc = db.query(Account).filter(
        Account.id == trade.account_id, Account.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=403, detail="Forbidden")

    symbol_row = db.query(Symbol).filter(Symbol.id == trade.symbol_id).first()
    if not symbol_row:
        raise HTTPException(status_code=404, detail="Symbol not found")

    open_time = trade.open_time.replace(tzinfo=timezone.utc)
    close_time = (trade.close_time or open_time).replace(tzinfo=timezone.utc)

    _WINDOW = {
        "M1":  timedelta(hours=2),
        "M5":  timedelta(hours=8),
        "M15": timedelta(hours=12),
        "H1":  timedelta(days=4),
        "H4":  timedelta(days=16),
        "D1":  timedelta(days=60),
    }
    window = _WINDOW.get(timeframe.upper(), timedelta(hours=12))
    from_dt = open_time - window
    to_dt = close_time + window

    try:
        import MetaTrader5 as mt5
        if not mt5.initialize():
            raise HTTPException(status_code=503, detail="MT5 unavailable")

        _TF_MAP = {
            "M1":  mt5.TIMEFRAME_M1,
            "M5":  mt5.TIMEFRAME_M5,
            "M15": mt5.TIMEFRAME_M15,
            "H1":  mt5.TIMEFRAME_H1,
            "H4":  mt5.TIMEFRAME_H4,
            "D1":  mt5.TIMEFRAME_D1,
        }
        tf = _TF_MAP.get(timeframe.upper(), mt5.TIMEFRAME_M15)

        rates = mt5.copy_rates_range(symbol_row.symbol, tf, from_dt, to_dt)
        mt5.shutdown()

        if rates is None or len(rates) == 0:
            return {
                "bars": [],
                "entry_price": float(trade.entry_price),
                "exit_price": float(trade.exit_price or 0),
                "stop_loss": float(trade.stop_loss or 0),
                "take_profit": float(trade.take_profit or 0),
                "open_time": int(open_time.timestamp()),
                "close_time": int(close_time.timestamp()),
                "timeframe": timeframe.upper(),
            }

        bars = [
            {"time": int(r["time"]), "open": float(r["open"]), "high": float(r["high"]),
             "low": float(r["low"]), "close": float(r["close"])}
            for r in rates
        ]
        return {
            "bars": bars,
            "entry_price": float(trade.entry_price),
            "exit_price": float(trade.exit_price) if trade.exit_price else None,
            "stop_loss": float(trade.stop_loss) if trade.stop_loss else None,
            "take_profit": float(trade.take_profit) if trade.take_profit else None,
            "open_time": int(open_time.timestamp()),
            "close_time": int(close_time.timestamp()),
            "side": trade.side,
            "timeframe": timeframe.upper(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
