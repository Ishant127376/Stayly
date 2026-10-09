from datetime import date

from sqlalchemy import Select, and_, select
from sqlalchemy.orm import Session

from app.models.booking import Booking


def confirmed_booking_overlap_condition(check_in: date, check_out: date):
    return and_(
        Booking.status == "confirmed",
        check_in < Booking.check_out,
        check_out > Booking.check_in,
    )


def confirmed_booking_overlap_query(
    listing_id: int,
    check_in: date,
    check_out: date,
) -> Select[tuple[Booking]]:
    """Return confirmed bookings that overlap a half-open requested date range."""
    return select(Booking).where(
        Booking.listing_id == listing_id,
        confirmed_booking_overlap_condition(check_in, check_out),
    )


def has_confirmed_booking_overlap(
    db: Session,
    listing_id: int,
    check_in: date,
    check_out: date,
) -> bool:
    return db.scalar(confirmed_booking_overlap_query(listing_id, check_in, check_out).limit(1)) is not None
