from datetime import datetime

try:
    import MetaTrader5 as mt5
except ImportError:  # pragma: no cover
    mt5 = None

from app.core.config import settings


class MT5Client:
    def initialize(self) -> bool:
        if mt5 is None:
            raise RuntimeError("MetaTrader5 package is not installed.")

        initialized = mt5.initialize(
            path=settings.mt5_path,
            login=int(settings.mt5_login) if settings.mt5_login else None,
            password=settings.mt5_password,
            server=settings.mt5_server,
        )
        if not initialized:
            raise RuntimeError(f"Failed to initialize MT5: {mt5.last_error()}")
        return initialized

    def shutdown(self) -> None:
        if mt5:
            mt5.shutdown()

    def get_historical_deals(self, start: datetime, end: datetime):
        if mt5 is None:
            raise RuntimeError("MetaTrader5 package is not installed.")
        return mt5.history_deals_get(start, end)
