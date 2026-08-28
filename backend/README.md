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

## MT5 sync

`MetaTrader5` is a Windows-only package with no Linux wheel, and it can only
talk to a terminal running on the same machine — so it's deliberately **not**
in `requirements.txt` (that would break hosted/Linux deployments). Two ways
to sync trades:

- **Hosted deployments**: users run the standalone agent in `../agent/`
  on their own PC (where MT5 lives), which pushes data to
  `POST /api/import/mt5/ingest`.
- **Local dev on Windows**: if you want the old direct "Sync MT5" button
  (`POST /api/import/mt5`) to work against a backend running on your own PC
  with MT5 installed, manually install the package into this venv:
  `pip install MetaTrader5 numpy`.
