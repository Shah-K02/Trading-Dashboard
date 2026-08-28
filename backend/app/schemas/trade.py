from datetime import datetime
from uuid import UUID
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class TradeListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    side: str
    status: str
    open_time: datetime
    close_time: datetime | None
    entry_price: float
    exit_price: float | None
    lot_size: float
    net_pnl: float
    planned_rr: float | None
    actual_rr: float | None
    strategy_tag: str | None = None


class TradeDetailResponse(TradeListItem):
    stop_loss: float | None = None
    take_profit: float | None = None
    gross_pnl: float
    commission: float
    swap: float
    fees: float
    risk_amount: float | None = None
    reward_amount: float | None = None
    setup_tag: str | None = None
    session: str | None = None
    note_summary: str | None = None
    # computed / extra fields returned from the route:
    symbol_name: Optional[str] = None
    journal_images: Optional[List[str]] = None


class JournalUpdateRequest(BaseModel):
    note_summary: str | None = None


class BulkTagUpdateRequest(BaseModel):
    trade_ids: list[UUID]
    strategy_tag: str | None = None
    setup_tag: str | None = None
    session: str | None = None


class BulkTagUpdateResponse(BaseModel):
    updated_count: int
