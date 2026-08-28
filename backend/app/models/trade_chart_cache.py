import uuid

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class TradeChartCache(Base):
    """OHLC bars pushed by the local sync agent for a trade, so the hosted
    backend can serve the trade-detail candlestick chart without reaching
    MT5 directly (see agent/tradelens_agent.py)."""

    __tablename__ = "trade_chart_cache"
    __table_args__ = (UniqueConstraint("trade_id", "timeframe", name="uq_trade_chart_cache_trade_timeframe"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    trade_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trades.id", ondelete="CASCADE"), nullable=False, index=True)
    timeframe: Mapped[str] = mapped_column(String(4), nullable=False)
    bars: Mapped[list] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
