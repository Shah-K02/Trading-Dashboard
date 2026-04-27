import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"))
    symbol_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("symbols.id", ondelete="RESTRICT"))

    external_position_id: Mapped[int | None]
    external_order_id: Mapped[int | None]
    external_deal_ids: Mapped[list[int] | None] = mapped_column(ARRAY(item_type=BigInteger), nullable=True)

    side: Mapped[str] = mapped_column(ENUM('buy', 'sell', name='trade_side', create_type=False), nullable=False)
    status: Mapped[str] = mapped_column(ENUM('open', 'closed', 'cancelled', 'partial', name='trade_status', create_type=False), nullable=False, default="closed")

    open_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    close_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    entry_price: Mapped[float] = mapped_column(Numeric(20, 10), nullable=False)
    exit_price: Mapped[float | None] = mapped_column(Numeric(20, 10))
    stop_loss: Mapped[float | None] = mapped_column(Numeric(20, 10))
    take_profit: Mapped[float | None] = mapped_column(Numeric(20, 10))
    lot_size: Mapped[float] = mapped_column(Numeric(20, 4), nullable=False)

    gross_pnl: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    commission: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    swap: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    fees: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    net_pnl: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False, default=0)

    risk_amount: Mapped[float | None] = mapped_column(Numeric(20, 2))
    reward_amount: Mapped[float | None] = mapped_column(Numeric(20, 2))
    planned_rr: Mapped[float | None] = mapped_column(Numeric(12, 4))
    actual_rr: Mapped[float | None] = mapped_column(Numeric(12, 4))

    strategy_tag: Mapped[str | None] = mapped_column(String(120))
    setup_tag: Mapped[str | None] = mapped_column(String(120))
    session: Mapped[str | None] = mapped_column(ENUM('asia', 'london', 'new_york', 'overlap', 'other', name='session_type', create_type=False))
    note_summary: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
