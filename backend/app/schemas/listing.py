from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserRead


class ListingImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    display_order: int


class AmenityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ListingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    host_id: int
    title: str
    description: str
    location: str
    city: str
    country: str
    latitude: Decimal | None
    longitude: Decimal | None
    property_type: str
    price_per_night: Decimal
    max_guests: int = Field(gt=0)
    bedrooms: int = Field(ge=0)
    beds: int = Field(ge=0)
    bathrooms: Decimal = Field(ge=0)
    rating: Decimal = Field(ge=0, le=5)
    review_count: int = Field(ge=0)
    created_at: datetime
    updated_at: datetime
    host: UserRead
    images: list[ListingImageRead]
    amenities: list[AmenityRead]


class ListingCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10)
    location: str = Field(min_length=2, max_length=200)
    city: str = Field(min_length=2, max_length=100)
    country: str = Field(min_length=2, max_length=100)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    property_type: str = Field(min_length=2, max_length=50)
    price_per_night: Decimal = Field(ge=0)
    max_guests: int = Field(gt=0)
    bedrooms: int = Field(ge=0)
    beds: int = Field(ge=0)
    bathrooms: Decimal = Field(ge=0)
    images: list[str] = Field(min_length=1, max_length=20)
    amenities: list[str] = Field(default_factory=list, max_length=30)


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, min_length=10)
    location: str | None = Field(default=None, min_length=2, max_length=200)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    country: str | None = Field(default=None, min_length=2, max_length=100)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    property_type: str | None = Field(default=None, min_length=2, max_length=50)
    price_per_night: Decimal | None = Field(default=None, ge=0)
    max_guests: int | None = Field(default=None, gt=0)
    bedrooms: int | None = Field(default=None, ge=0)
    beds: int | None = Field(default=None, ge=0)
    bathrooms: Decimal | None = Field(default=None, ge=0)
    images: list[str] | None = Field(default=None, min_length=1, max_length=20)
    amenities: list[str] | None = Field(default=None, max_length=30)


class ListingPage(BaseModel):
    items: list[ListingRead]
    page: int
    limit: int
    total: int
    pages: int


class BlockedRange(BaseModel):
    check_in: date
    check_out: date


class AvailabilityRead(BaseModel):
    listing_id: int
    blocked_ranges: list[BlockedRange]
