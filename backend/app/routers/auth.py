import hashlib
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pwdlib import PasswordHash
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import SESSION_COOKIE_NAME, utc_now
from app.database.session import get_db
from app.models import AuthSession, User, UserCredential
from app.schemas.auth import LoginRequest, SignupRequest
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["authentication"])
password_hasher = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hasher.hash(secrets.token_urlsafe(24))
INVALID_CREDENTIALS = "Invalid email or password."


def set_session_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=raw_token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )


def add_session(db: Session, user: User) -> str:
    raw_token = secrets.token_urlsafe(32)
    db.add(AuthSession(
        user_id=user.id,
        token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
        expires_at=utc_now() + timedelta(days=settings.session_ttl_days),
    ))
    return raw_token


@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = str(payload.email).strip().casefold()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(name=payload.name, email=email, role="guest")
    db.add(user)
    try:
        db.flush()
        db.add(UserCredential(
            user_id=user.id,
            password_hash=password_hasher.hash(payload.password.get_secret_value()),
        ))
        raw_token = add_session(db, user)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from error

    set_session_cookie(response, raw_token)
    return user


@router.post("/login", response_model=UserRead)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = str(payload.email).strip().casefold()
    row = db.execute(
        select(User, UserCredential)
        .join(UserCredential, UserCredential.user_id == User.id)
        .where(func.lower(User.email) == email)
    ).first()
    user, credential = row if row is not None else (None, None)
    stored_hash = credential.password_hash if credential is not None else DUMMY_PASSWORD_HASH
    try:
        valid_password = password_hasher.verify(payload.password.get_secret_value(), stored_hash)
    except Exception:
        valid_password = False
    if user is None or not valid_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)

    raw_token = add_session(db, user)
    db.commit()
    set_session_cookie(response, raw_token)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> Response:
    raw_token = request.cookies.get(SESSION_COOKIE_NAME)
    if raw_token:
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))
        if session is not None and session.revoked_at is None:
            session.revoked_at = utc_now()
            db.commit()
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
