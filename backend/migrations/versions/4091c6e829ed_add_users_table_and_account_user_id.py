"""add_users_table_and_account_user_id

Revision ID: 4091c6e829ed
Revises: 
Create Date: 2026-04-18 23:03:14.671165

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '4091c6e829ed'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the users table
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('username', sa.String(length=64), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 2. Add user_id FK to accounts (nullable so existing rows are preserved)
    op.add_column('accounts', sa.Column('user_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_accounts_user_id'), 'accounts', ['user_id'], unique=False)
    op.create_foreign_key(
        'fk_accounts_user_id_users', 'accounts', 'users', ['user_id'], ['id'], ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_constraint('fk_accounts_user_id_users', 'accounts', type_='foreignkey')
    op.drop_index(op.f('ix_accounts_user_id'), table_name='accounts')
    op.drop_column('accounts', 'user_id')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_table('users')
