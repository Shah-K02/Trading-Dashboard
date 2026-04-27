from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.mt5_service import sync_mt5_trades
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
