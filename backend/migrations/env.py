from logging.config import fileConfig
import os
import sys

# Make sure the backend package is on sys.path so models can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import engine_from_config, pool
from alembic import context

# Load app config and models so autogenerate can see the metadata
from app.core.config import settings
from app.db.session import Base  # noqa: F401

# Import all models so their tables are registered on Base.metadata
import app.models.user               # noqa: F401
import app.models.account            # noqa: F401
import app.models.trade              # noqa: F401
import app.models.symbol             # noqa: F401
import app.models.trade_chart_cache  # noqa: F401

alembic_config = context.config
alembic_config.set_main_option("sqlalchemy.url", settings.database_url)

if alembic_config.config_file_name is not None:
    fileConfig(alembic_config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = alembic_config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        alembic_config.get_section(alembic_config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
