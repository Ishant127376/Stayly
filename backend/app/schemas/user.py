from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    name: str
    email: EmailStr
    avatar: str | None = None
    role: Literal["guest", "host", "both"] = "guest"


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
