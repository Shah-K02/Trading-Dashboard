# Multi-Account Selection System — Walkthrough

**Date:** 2026-03-24 | **Version:** v0.3-dev

A complete **account selection system** was implemented, allowing you to switch between multiple MT5 accounts and have all charts, stats, and trade data update accordingly.

---

## Changes Made

### Backend (FastAPI)

| File | Change |
|------|--------|
| `api/routes/accounts.py` | **NEW** — `GET /api/accounts`, `GET /api/accounts/active`, `PUT /api/accounts/{id}/select` |
| `api/router.py` | Registered accounts router at `/api/accounts` |
| `api/routes/analytics.py` | All 5 endpoints now accept `?account_id=UUID`; falls back to active account |
| `api/routes/trades.py` | List trades accepts `?account_id=UUID` and filters by it |
| `services/analytics_service.py` | `get_calendar_data()` now accepts `account_id` and filters trades |

### Frontend (React)

| File | Change |
|------|--------|
| `lib/api.ts` | Added `fetchAccounts`, `fetchActiveAccount`, `selectAccount`; all fetchers accept optional `accountId` |
| `lib/store.ts` | Added `activeAccount` state + `loadActiveAccount()` action |
| `components/layout/AccountSwitcher.tsx` | **NEW** — Dropdown with broker avatar, account number, currency badge |
| `components/layout/AppLayout.tsx` | Loads active account on mount; embeds `<AccountSwitcher />` in header |
| `pages/DashboardPage.tsx` | All 4 analytics queries keyed by `accountId` |
| `pages/TradesPage.tsx` | Trades table query keyed by `accountId`; passes `accountId` to calendar |
| `pages/AnalyticsPage.tsx` | Both analytics queries keyed by `accountId` |
| `components/trades/TradeCalendar.tsx` | Accepts `accountId` prop; calendar query filtered by it |
| `components/trades/DayTradesPanel.tsx` | Accepts `accountId` prop; day trades query filtered by it |

---

## How It Works End-to-End

1. **App loads** → `AppLayout` calls `loadActiveAccount()` → `GET /api/accounts/active` → stored in Zustand
2. **All pages** read `activeAccount.id` from the store and include it in React Query keys
3. **User opens switcher** → dropdown fetches `GET /api/accounts` → lists all accounts
4. **User selects an account** → `PUT /api/accounts/{id}/select` marks it active in DB → `setActiveAccount()` updates store → React Query automatically refetches all queries with the new key
5. **Page refresh** → step 1 repeats; backend returns the last selected account (persisted via `is_active` DB flag)

---

## Result

The `AccountSwitcher` component appears in the top-right of the header showing the broker's initials, account name, number, and currency badge. Two accounts were confirmed working in the dropdown (`#2575403` and `#2594777`), with no console errors.
