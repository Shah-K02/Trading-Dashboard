-- Trading Analytics Dashboard PostgreSQL Schema
-- Suitable for PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Optional enum types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_side') THEN
        CREATE TYPE trade_side AS ENUM ('buy', 'sell');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trade_status') THEN
        CREATE TYPE trade_status AS ENUM ('open', 'closed', 'cancelled', 'partial');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_class_type') THEN
        CREATE TYPE asset_class_type AS ENUM ('forex', 'crypto', 'indices', 'commodities', 'stocks', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN
        CREATE TYPE session_type AS ENUM ('asia', 'london', 'new_york', 'overlap', 'other');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_name VARCHAR(120) NOT NULL,
    account_name VARCHAR(120),
    account_number VARCHAR(64) NOT NULL UNIQUE,
    server_name VARCHAR(120),
    base_currency CHAR(3) NOT NULL DEFAULT 'USD',
    leverage VARCHAR(32),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS symbols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(32) NOT NULL UNIQUE,
    description VARCHAR(255),
    asset_class asset_class_type NOT NULL DEFAULT 'other',
    base_currency CHAR(3),
    quote_currency CHAR(3),
    tick_size NUMERIC(20, 10),
    tick_value NUMERIC(20, 10),
    contract_size NUMERIC(20, 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL DEFAULT 'mt5',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    imported_trades_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    symbol_id UUID NOT NULL REFERENCES symbols(id) ON DELETE RESTRICT,

    external_position_id BIGINT,
    external_order_id BIGINT,
    external_deal_ids BIGINT[],

    side trade_side NOT NULL,
    status trade_status NOT NULL DEFAULT 'closed',

    open_time TIMESTAMPTZ NOT NULL,
    close_time TIMESTAMPTZ,

    entry_price NUMERIC(20, 10) NOT NULL,
    exit_price NUMERIC(20, 10),
    stop_loss NUMERIC(20, 10),
    take_profit NUMERIC(20, 10),

    lot_size NUMERIC(20, 4) NOT NULL,
    volume_units NUMERIC(20, 4),

    gross_pnl NUMERIC(20, 2) NOT NULL DEFAULT 0,
    commission NUMERIC(20, 2) NOT NULL DEFAULT 0,
    swap NUMERIC(20, 2) NOT NULL DEFAULT 0,
    fees NUMERIC(20, 2) NOT NULL DEFAULT 0,
    net_pnl NUMERIC(20, 2) NOT NULL DEFAULT 0,

    risk_amount NUMERIC(20, 2),
    reward_amount NUMERIC(20, 2),
    planned_rr NUMERIC(12, 4),
    actual_rr NUMERIC(12, 4),

    max_favourable_excursion NUMERIC(20, 2),
    max_adverse_excursion NUMERIC(20, 2),

    holding_seconds INTEGER,
    strategy_tag VARCHAR(120),
    setup_tag VARCHAR(120),
    session session_type DEFAULT 'other',
    weekday SMALLINT CHECK (weekday BETWEEN 0 AND 6),

    note_summary TEXT,
    is_manually_edited BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT trades_order_unique UNIQUE (account_id, external_order_id),
    CONSTRAINT trades_position_unique UNIQUE (account_id, external_position_id, open_time)
);

CREATE TABLE IF NOT EXISTS trade_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    external_deal_id BIGINT,
    execution_time TIMESTAMPTZ NOT NULL,
    execution_type VARCHAR(32) NOT NULL, -- entry, exit, partial, stop_loss, take_profit
    price NUMERIC(20, 10) NOT NULL,
    volume NUMERIC(20, 4) NOT NULL,
    pnl NUMERIC(20, 2) NOT NULL DEFAULT 0,
    commission NUMERIC(20, 2) NOT NULL DEFAULT 0,
    swap NUMERIC(20, 2) NOT NULL DEFAULT 0,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trade_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    tag VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT trade_tags_unique UNIQUE (trade_id, tag)
);

CREATE TABLE IF NOT EXISTS trade_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trade_screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_equity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    balance NUMERIC(20, 2) NOT NULL DEFAULT 0,
    equity NUMERIC(20, 2) NOT NULL DEFAULT 0,
    floating_pnl NUMERIC(20, 2) NOT NULL DEFAULT 0,
    daily_net_pnl NUMERIC(20, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT daily_equity_unique UNIQUE (account_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    cache_key VARCHAR(120) NOT NULL,
    payload JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT analytics_cache_unique UNIQUE (account_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_id ON trades(symbol_id);
CREATE INDEX IF NOT EXISTS idx_trades_open_time ON trades(open_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_close_time ON trades(close_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_strategy_tag ON trades(strategy_tag);
CREATE INDEX IF NOT EXISTS idx_trade_executions_trade_id ON trade_executions(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_tags_trade_id ON trade_tags(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_notes_trade_id ON trade_notes(trade_id);
CREATE INDEX IF NOT EXISTS idx_daily_equity_account_date ON daily_equity_snapshots(account_id, snapshot_date DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_trades_updated_at ON trades;
CREATE TRIGGER trg_trades_updated_at
BEFORE UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_trade_notes_updated_at ON trade_notes;
CREATE TRIGGER trg_trade_notes_updated_at
BEFORE UPDATE ON trade_notes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
