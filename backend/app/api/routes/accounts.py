from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account
from app.models.user import User

router = APIRouter()


def _account_dict(a: Account) -> dict:
    return {
        "id": str(a.id),
        "broker_name": a.broker_name,
        "account_name": a.account_name,
        "account_number": a.account_number,
        "server_name": a.server_name,
        "base_currency": a.base_currency,
        "leverage": a.leverage,
        "is_active": a.is_active,
        "last_synced_at": a.last_synced_at.isoformat() if a.last_synced_at else None,
    }


@router.get("")
def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all MT5 accounts belonging to the authenticated user."""
    accounts = (
        db.query(Account)
        .filter(Account.user_id == current_user.id)
        .order_by(Account.created_at.asc())
        .all()
    )
    return [_account_dict(a) for a in accounts]


@router.get("/active")
def get_active_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the currently selected account for this user."""
    account = (
        db.query(Account)
        .filter(Account.user_id == current_user.id, Account.is_active == True)
        .first()
    )
    if not account:
        # Fall back to first account if none marked active
        account = db.query(Account).filter(Account.user_id == current_user.id).first()
        if not account:
            raise HTTPException(status_code=404, detail="No accounts found. Sync MT5 first.")
        account.is_active = True
        db.commit()
    return _account_dict(account)


@router.put("/{account_id}/select")
def select_account(
    account_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark one account as active; deactivate all others for this user."""
    target = (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id == current_user.id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Account not found")

    # Deactivate all accounts for this user
    db.query(Account).filter(Account.user_id == current_user.id).update({"is_active": False})
    # Activate target
    target.is_active = True
    db.commit()

    return _account_dict(target)
