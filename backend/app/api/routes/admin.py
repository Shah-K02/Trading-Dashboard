"""Admin-only endpoints for managing users and accounts."""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.account import Account
from app.models.trade import Trade
from app.models.user import User

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: dict


class AdminUserOut(BaseModel):
    id: str
    username: str
    email: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime
    account_count: int
    trade_count: int


class AdminAccountOut(BaseModel):
    id: str
    broker_name: str
    account_name: Optional[str]
    account_number: str
    server_name: Optional[str]
    base_currency: str
    leverage: Optional[str]
    is_active: bool
    created_at: datetime
    owner_username: Optional[str]


class AdminStatsOut(BaseModel):
    total_users: int
    total_accounts: int
    total_trades: int
    active_users: int
    admin_users: int


class ToggleStatusBody(BaseModel):
    is_active: bool


class ToggleAdminBody(BaseModel):
    is_admin: bool


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AdminTokenResponse)
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    """Authenticate and return a JWT. Only succeeds for users with is_admin=True."""
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    token = create_access_token({"sub": str(user.id), "is_admin": True})
    return AdminTokenResponse(
        access_token=token,
        admin={"id": str(user.id), "username": user.username},
    )


@router.get("/stats", response_model=AdminStatsOut)
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Platform-wide stats."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    admin_users = db.query(func.count(User.id)).filter(User.is_admin == True).scalar() or 0
    total_accounts = db.query(func.count(Account.id)).scalar() or 0
    total_trades = db.query(func.count(Trade.id)).scalar() or 0
    return AdminStatsOut(
        total_users=total_users,
        total_accounts=total_accounts,
        total_trades=total_trades,
        active_users=active_users,
        admin_users=admin_users,
    )


@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """List all users. Never returns passwords or tokens."""
    q = db.query(User)
    if search:
        q = q.filter(User.username.ilike(f"%{search}%"))
    users = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for u in users:
        account_count = db.query(func.count(Account.id)).filter(Account.user_id == u.id).scalar() or 0
        trade_count = (
            db.query(func.count(Trade.id))
            .join(Account, Trade.account_id == Account.id)
            .filter(Account.user_id == u.id)
            .scalar() or 0
        )
        result.append(AdminUserOut(
            id=str(u.id),
            username=u.username,
            email=u.email,
            is_active=u.is_active,
            is_admin=u.is_admin,
            created_at=u.created_at,
            account_count=account_count,
            trade_count=trade_count,
        ))
    return result


@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: uuid.UUID,
    body: ToggleStatusBody,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Enable or disable a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own active status")
    user.is_active = body.is_active
    db.commit()
    return {"id": str(user.id), "is_active": user.is_active}


@router.patch("/users/{user_id}/admin")
def toggle_user_admin(
    user_id: uuid.UUID,
    body: ToggleAdminBody,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Grant or revoke admin privileges."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")
    user.is_admin = body.is_admin
    db.commit()
    return {"id": str(user.id), "is_admin": user.is_admin}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Hard-delete a user and all their data via cascade."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(user)
    db.commit()


@router.get("/accounts", response_model=list[AdminAccountOut])
def list_accounts(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """List all MT5 accounts with owner username."""
    q = db.query(Account)
    if search:
        q = q.filter(
            Account.account_number.ilike(f"%{search}%") |
            Account.broker_name.ilike(f"%{search}%")
        )
    accounts = q.order_by(Account.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for a in accounts:
        owner_username = None
        if a.user_id:
            owner = db.query(User).filter(User.id == a.user_id).first()
            owner_username = owner.username if owner else None
        result.append(AdminAccountOut(
            id=str(a.id),
            broker_name=a.broker_name,
            account_name=a.account_name,
            account_number=a.account_number,
            server_name=a.server_name,
            base_currency=a.base_currency,
            leverage=a.leverage,
            is_active=a.is_active,
            created_at=a.created_at,
            owner_username=owner_username,
        ))
    return result


@router.patch("/accounts/{account_id}/status")
def toggle_account_status(
    account_id: uuid.UUID,
    body: ToggleStatusBody,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Enable or disable an MT5 account."""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.is_active = body.is_active
    db.commit()
    return {"id": str(account.id), "is_active": account.is_active}
