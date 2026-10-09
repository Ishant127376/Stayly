from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_current_user(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/me/become-host", response_model=UserRead)
def become_host(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    if user.role == "guest":
        user.role = "both"
        db.commit()
        db.refresh(user)
    return user
