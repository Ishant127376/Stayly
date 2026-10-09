from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WishlistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    listing_id: int
    created_at: datetime


class WishlistListing(BaseModel):
    id: int
    title: str
    city: str
    country: str
    price_per_night: float
    rating: float
    images: list[str]


class WishlistItemRead(WishlistRead):
    listing: WishlistListing
