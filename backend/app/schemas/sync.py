from datetime import datetime
from pydantic import BaseModel


class AccountInfoPayload(BaseModel):
    login: int
    company: str
    name: str
    server: str
    currency: str
    leverage: int


class DealPayload(BaseModel):
    position_id: int
    order_id: int | None = None
    deal_id: int | None = None
    entry: int    # 0=IN, 1=OUT, 3=OUT_BY (mt5.DEAL_ENTRY_* values)
    type: int     # 0=BUY, 1=SELL (mt5.DEAL_TYPE_* values)
    price: float
    volume: float
    profit: float
    commission: float
    swap: float
    fee: float
    time: int     # unix epoch seconds (deal.time from MT5)
    symbol: str


class IngestRequest(BaseModel):
    account: AccountInfoPayload
    deals: list[DealPayload]


class IngestResponse(BaseModel):
    message: str
    new_trades_count: int
    last_synced_at: datetime
