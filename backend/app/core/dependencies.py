import hashlib
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import AuthSession, User

SESSION_COOKIE_NAME = "stayly_session"


def utc_now() -> datetime:
    # SQLite stores these timestamps without timezone metadata; keep all values UTC-naive.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    raw_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
        )

    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))
    if session is None or session.revoked_at is not None or session.expires_at <= utc_now():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
        )

    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
        )
    return user


def require_host(user: User = Depends(get_current_user)) -> User:
    if user.role not in {"host", "both"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Host access is required for this operation.",
        )
    return user
