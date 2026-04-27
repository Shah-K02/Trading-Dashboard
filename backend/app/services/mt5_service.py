import MetaTrader5 as mt5
from datetime import datetime, timezone, timedelta
import uuid
import logging
from sqlalchemy.orm import Session
from app.models.account import Account
from app.models.trade import Trade
from app.models.symbol import Symbol

logger = logging.getLogger(__name__)

def sync_mt5_trades(db: Session, user_id: uuid.UUID, from_date: datetime | None = None, to_date: datetime | None = None) -> int:
    """Connects to MT5, fetches trade history, and saves to DB."""
    if not mt5.initialize():
        error_code = mt5.last_error()
        logger.error(f"MT5 initialize() failed, error code = {error_code}")
        raise Exception(f"Failed to initialize MT5. Ensure MT5 is running. Error: {error_code}")

    # Ensure we are connected
    account_info = mt5.account_info()
    if account_info is None:
        raise Exception("Failed to get MT5 account info. Are you logged in?")

    # 1. Upsert Account
    account_number = str(account_info.login)
    account = db.query(Account).filter(Account.account_number == account_number).first()
    if not account:
        account = Account(
            id=uuid.uuid4(),
            user_id=user_id,
            broker_name=account_info.company,
            account_name=account_info.name,
            account_number=account_number,
            server_name=account_info.server,
            base_currency=account_info.currency,
            leverage=str(account_info.leverage),
        )
        db.add(account)
        db.commit()
    elif account.user_id is None:
        # Claim legacy account that was synced before auth was added
        account.user_id = user_id
        db.commit()
    
    # Set default date range if not provided (e.g., last 30 days)
    if not to_date:
        to_date = datetime.now(timezone.utc)
    if not from_date:
        from_date = to_date - timedelta(days=365) # Last 1 year

    # 2. Fetch Deals (Trades closed)
    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        mt5.shutdown()
        return 0

    new_trades_count = 0

    # Group deals by position ID
    position_deals = {}
    for deal in deals:
        pos_id = deal.position_id
        if pos_id not in position_deals:
            position_deals[pos_id] = []
        position_deals[pos_id].append(deal)

    for pos_id, pos_deals in position_deals.items():
        # Check if trade already exists
        trade = db.query(Trade).filter(
            Trade.account_id == account.id,
            Trade.external_position_id == pos_id
        ).first()

        if trade:
            continue # Trade already synced (assuming it's closed, we could update if partial)

        # Basic filtering to reconstruct a trade. 
        # MT5 positions have entry deal(s) and exit deal(s).
        entry_deals = [d for d in pos_deals if d.entry == mt5.DEAL_ENTRY_IN]
        exit_deals = [d for d in pos_deals if d.entry in [mt5.DEAL_ENTRY_OUT, mt5.DEAL_ENTRY_OUT_BY]]

        if not entry_deals or not exit_deals:
            continue # Incomplete trade (still open or missing data)

        symbol_name = entry_deals[0].symbol
        
        # Upsert Symbol
        symbol = db.query(Symbol).filter(Symbol.symbol == symbol_name).first()
        if not symbol:
            symbol = Symbol(
                id=uuid.uuid4(),
                symbol=symbol_name,
                asset_class="other" # Simplified
            )
            db.add(symbol)
            db.commit()

        # Calculate metrics
        entry_price = sum(d.price * d.volume for d in entry_deals) / sum(d.volume for d in entry_deals)
        exit_price = sum(d.price * d.volume for d in exit_deals) / sum(d.volume for d in exit_deals)
        total_volume = sum(d.volume for d in entry_deals)
        
        gross_pnl = sum(d.profit for d in exit_deals)
        commission = sum(d.commission for d in pos_deals)
        swap = sum(d.swap for d in pos_deals)
        fee = sum(d.fee for d in pos_deals)
        net_pnl = gross_pnl + commission + swap + fee

        side = "buy" if entry_deals[0].type == mt5.DEAL_TYPE_BUY else "sell"
        
        open_time = datetime.fromtimestamp(entry_deals[0].time, tz=timezone.utc)
        close_time = datetime.fromtimestamp(exit_deals[-1].time, tz=timezone.utc)

        new_trade = Trade(
            id=uuid.uuid4(),
            account_id=account.id,
            symbol_id=symbol.id,
            external_position_id=pos_id,
            side=side,
            status="closed",
            open_time=open_time,
            close_time=close_time,
            entry_price=entry_price,
            exit_price=exit_price,
            lot_size=total_volume,
            gross_pnl=gross_pnl,
            commission=commission,
            swap=swap,
            fees=fee,
            net_pnl=net_pnl,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(new_trade)
        new_trades_count += 1
    
    db.commit()
    mt5.shutdown()
    return new_trades_count
