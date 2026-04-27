# TradeLens Backend

This starter project gives you a clean FastAPI backend for a MetaTrader 5 trading analytics dashboard.

## What is included
- PostgreSQL schema
- FastAPI app structure
- SQLAlchemy session setup
- MT5 client service scaffold
- Trade and analytics routes
- Example health endpoint

## Quick start

1. Create a virtual environment
2. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```
3. Copy environment file
   ```bash
   cp .env.example .env
   ```
4. Create the database and run the SQL schema
   ```bash
   psql -U postgres -d trading_dashboard -f schema.sql
   ```
5. Start the API
   ```bash
   uvicorn app.main:app --reload
   ```

## Suggested next steps
- Implement MT5 import logic in `app/services/mt5_client.py`
- Add trade normalisation logic
- Add authentication later
- Add tests for P&L and RR calculations
