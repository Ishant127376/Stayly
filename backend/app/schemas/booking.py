from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BookingBase(BaseModel):
    listing_id: int
    check_in: date
    check_out: date
    guests: int = Field(gt=0)

    @model_validator(mode="after")
    def validate_date_range(self) -> "BookingBase":
        if self.check_out <= self.check_in:
            raise ValueError("check_out must be after check_in")
        return self


class BookingCreate(BaseModel):
    listing_id: int
    check_in: date
    check_out: date
    guests: int = Field(gt=0)


class BookingRead(BookingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    guest_id: int
    nightly_price: Decimal
    cleaning_fee: Decimal
    service_fee: Decimal
    total_price: Decimal
    status: str
    created_at: datetime


class BookingImageSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    url: str
    display_order: int


class BookingListingSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    city: str
    country: str
    images: list[BookingImageSummary]


class BookingWithListing(BookingRead):
    listing: BookingListingSummary


class BookingGuestSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    avatar: str | None


class BookingHostRead(BookingRead):
    guest: BookingGuestSummary
