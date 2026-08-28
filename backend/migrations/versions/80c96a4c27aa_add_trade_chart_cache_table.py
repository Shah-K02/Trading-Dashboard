"""add_trade_chart_cache_table

Revision ID: 80c96a4c27aa
Revises: b2c3d4e5f6a7
Create Date: 2026-08-28 23:25:19.962366

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '80c96a4c27aa'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'trade_chart_cache',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('trade_id', sa.UUID(), nullable=False),
        sa.Column('timeframe', sa.String(length=4), nullable=False),
        sa.Column('bars', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['trade_id'], ['trades.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('trade_id', 'timeframe', name='uq_trade_chart_cache_trade_timeframe'),
    )
    op.create_index(op.f('ix_trade_chart_cache_trade_id'), 'trade_chart_cache', ['trade_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_trade_chart_cache_trade_id'), table_name='trade_chart_cache')
    op.drop_table('trade_chart_cache')
