import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    # user_id links this MT5 account to its owner; NULL for legacy rows migrated before auth
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    broker_name: Mapped[str] = mapped_column(String(120), nullable=False)
    account_name: Mapped[str | None] = mapped_column(String(120))
    account_number: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    server_name: Mapped[str | None] = mapped_column(String(120))
    base_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    leverage: Mapped[str | None] = mapped_column(String(32))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_synced_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

