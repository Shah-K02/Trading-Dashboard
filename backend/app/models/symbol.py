import uuid

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Symbol(Base):
    __tablename__ = "symbols"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    symbol: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(255))
    asset_class: Mapped[str] = mapped_column(ENUM('forex', 'crypto', 'indices', 'commodities', 'stocks', 'other', name='asset_class_type', create_type=False), nullable=False, default="other")
    base_currency: Mapped[str | None] = mapped_column(String(3))
    quote_currency: Mapped[str | None] = mapped_column(String(3))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
