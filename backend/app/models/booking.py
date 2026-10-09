from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.listing import Listing
    from app.models.user import User


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("check_out > check_in", name="ck_booking_checkout_after_checkin"),
        CheckConstraint("guests > 0", name="ck_booking_guests_positive"),
        CheckConstraint("nightly_price >= 0", name="ck_booking_nightly_price_non_negative"),
        CheckConstraint("cleaning_fee >= 0", name="ck_booking_cleaning_fee_non_negative"),
        CheckConstraint("service_fee >= 0", name="ck_booking_service_fee_non_negative"),
        CheckConstraint("total_price >= 0", name="ck_booking_total_price_non_negative"),
        CheckConstraint("status IN ('confirmed', 'cancelled')", name="ck_booking_status"),
        Index("ix_bookings_listing_dates", "listing_id", "check_in", "check_out"),
        Index("ix_bookings_guest_id", "guest_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"), nullable=False)
    guest_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    check_in: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_out: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    guests: Mapped[int] = mapped_column(nullable=False)
    nightly_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    cleaning_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    service_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="confirmed")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    listing: Mapped["Listing"] = relationship(back_populates="bookings")
    guest: Mapped["User"] = relationship(back_populates="bookings")
