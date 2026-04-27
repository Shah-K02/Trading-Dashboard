"""
CLI script to promote an existing user to admin.

Usage:
    cd backend
    python create_admin.py <username>

The script will look up the user in the database, set is_admin=True,
and confirm the change. Run from inside the backend directory with
the venv activated.
"""
import sys
import os

# Make sure the app module can be found
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import get_db
from app.models.user import User


def promote_user(username: str) -> None:
    db = next(get_db())
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"[ERROR] No user found with username '{username}'")
            sys.exit(1)

        if user.is_admin:
            print(f"[INFO] '{username}' is already an admin. No changes made.")
            return

        user.is_admin = True
        db.commit()
        db.refresh(user)
        print(f"[OK] '{username}' has been promoted to admin successfully.")
        print(f"     User ID  : {user.id}")
        print(f"     Username : {user.username}")
        print(f"     is_admin : {user.is_admin}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python create_admin.py <username>")
        sys.exit(1)

    promote_user(sys.argv[1])
