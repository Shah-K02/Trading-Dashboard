"""FastAPI auth dependencies."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
admin_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login", scheme_name="AdminBearer")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate JWT token and return the authenticated User.

    Raises HTTP 401 if the token is missing, invalid, or expired.
    """
    credentials_err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_err
    except JWTError:
        raise credentials_err

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if user is None:
        raise credentials_err
    return user


def get_current_admin(
    token: str = Depends(admin_oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate JWT token and ensure the user has is_admin=True.

    Raises HTTP 401 for missing/invalid tokens, 403 for non-admins.
    """
    credentials_err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_err
    except JWTError:
        raise credentials_err

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if user is None:
        raise credentials_err
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return user
