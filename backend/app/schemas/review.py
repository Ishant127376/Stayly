from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewBase(BaseModel):
    listing_id: int
    user_id: int
    rating: int = Field(ge=1, le=5)
    comment: str


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=3, max_length=2000)


class ReviewRead(ReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class ReviewUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    avatar: str | None


class ReviewWithUser(ReviewRead):
    user: ReviewUser
