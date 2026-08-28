from datetime import datetime
from uuid import UUID
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


class NewTradeInfo(BaseModel):
    """Enough info for the sync agent to fetch OHLC chart bars for a trade it
    just created, without re-deriving the entry/exit-deal grouping itself."""
    trade_id: UUID
    symbol: str
    open_time: int   # unix epoch seconds
    close_time: int  # unix epoch seconds


class IngestResponse(BaseModel):
    message: str
    new_trades_count: int
    last_synced_at: datetime
    new_trades: list[NewTradeInfo] = []


class ChartBar(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float


class ChartPayload(BaseModel):
    trade_id: UUID
    timeframe: str
    bars: list[ChartBar]


class ChartIngestRequest(BaseModel):
    charts: list[ChartPayload]


class ChartIngestResponse(BaseModel):
    message: str
    stored_count: int
