import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account
from app.models.trade import Trade
from app.models.trade_chart_cache import TradeChartCache
from app.models.user import User
from app.schemas.sync import ChartIngestRequest, ChartIngestResponse, IngestRequest, IngestResponse
from app.services.mt5_service import process_synced_deals, sync_mt5_trades
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/mt5")
def import_mt5_trades(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        new_trades = sync_mt5_trades(db=db, user_id=current_user.id)
        return {"message": "MT5 import successful", "new_trades_count": new_trades}
    except Exception as e:
        logger.error(f"MT5 Import Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mt5/ingest", response_model=IngestResponse)
def ingest_mt5_trades(
    payload: IngestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Receives trade data pushed by the local sync agent (see agent/), since
    a hosted backend cannot reach a user's local MT5 terminal directly."""
    try:
        account_dict = payload.account.model_dump()
        deal_dicts = [d.model_dump() for d in payload.deals]
        new_trades_count, new_trades_info = process_synced_deals(db, current_user.id, account_dict, deal_dicts)
        account = db.query(Account).filter(
            Account.account_number == str(account_dict["login"])
        ).first()
        return IngestResponse(
            message="MT5 ingest successful",
            new_trades_count=new_trades_count,
            last_synced_at=account.last_synced_at,
            new_trades=new_trades_info,
        )
    except Exception as e:
        logger.error(f"MT5 Ingest Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mt5/charts", response_model=ChartIngestResponse)
def ingest_mt5_charts(
    payload: ChartIngestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Receives OHLC chart bars pushed by the local sync agent for trades it
    just created via /mt5/ingest, so the trade-detail candlestick chart works
    against a hosted backend (which cannot reach MT5 directly)."""
    try:
        stored = 0
        for chart in payload.charts:
            trade = db.query(Trade).join(Account).filter(
                Trade.id == chart.trade_id, Account.user_id == current_user.id
            ).first()
            if not trade:
                continue  # Not this user's trade — skip rather than fail the whole batch

            bars = [b.model_dump() for b in chart.bars]
            stmt = pg_insert(TradeChartCache).values(
                id=uuid.uuid4(),
                trade_id=chart.trade_id,
                timeframe=chart.timeframe.upper(),
                bars=bars,
            ).on_conflict_do_update(
                index_elements=["trade_id", "timeframe"],
                set_={"bars": bars},
            )
            db.execute(stmt)
            stored += 1
        db.commit()
        return ChartIngestResponse(message="Chart ingest successful", stored_count=stored)
    except Exception as e:
        logger.error(f"MT5 Chart Ingest Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
