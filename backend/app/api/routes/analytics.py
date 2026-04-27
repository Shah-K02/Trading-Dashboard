from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account
from app.models.user import User
from app.services.analytics_service import (
    get_full_summary,
    get_equity_curve,
    get_monthly_stats,
    get_symbol_breakdown,
    get_calendar_data,
    get_dow_breakdown,
    get_session_breakdown,
)

router = APIRouter()


def _resolve_account_id(db: Session, account_id: UUID | None, user_id: UUID) -> UUID | None:
    """Return the provided account_id (validated as belonging to this user), or fall back to the active account."""
    if account_id:
        # Ensure it belongs to the current user
        account = db.query(Account).filter(
            Account.id == account_id, Account.user_id == user_id
        ).first()
        return account.id if account else None

    active = db.query(Account).filter(
        Account.user_id == user_id, Account.is_active == True
    ).first()
    if not active:
        active = db.query(Account).filter(Account.user_id == user_id).first()
    return active.id if active else None


@router.get("/summary")
def analytics_summary(
    account_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_full_summary(db, _resolve_account_id(db, account_id, current_user.id))


@router.get("/equity")
def equity_curve(
    account_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_equity_curve(db, _resolve_account_id(db, account_id, current_user.id))


@router.get("/monthly")
def monthly_stats(
    account_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_monthly_stats(db, _resolve_account_id(db, account_id, current_user.id))


@router.get("/by-symbol")
def symbol_breakdown(
    account_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_symbol_breakdown(db, _resolve_account_id(db, account_id, current_user.id))


@router.get("/calendar")
def calendar_data(
    year: int,
    month: int,
    account_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_calendar_data(db, year, month, _resolve_account_id(db, account_id, current_user.id))


@router.get("/by-dow")
def dow_breakdown(
    account_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_dow_breakdown(db, _resolve_account_id(db, account_id, current_user.id))


@router.get("/by-session")
def session_breakdown(
    account_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_session_breakdown(db, _resolve_account_id(db, account_id, current_user.id))
