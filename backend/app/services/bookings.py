import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Booking, Listing, User
from app.schemas.booking import BookingCreate
from app.services.availability import has_confirmed_booking_overlap
from app.services.booking_email import send_booking_confirmation

MONEY = Decimal("0.01")
CLEANING_FEE_RATE = Decimal("0.08")
MIN_CLEANING_FEE = Decimal("25.00")
SERVICE_FEE_RATE = Decimal("0.12")
logger = logging.getLogger(__name__)


def money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def calculate_price(price_per_night: Decimal, check_in: date, check_out: date) -> dict[str, Decimal | int]:
    nights = (check_out - check_in).days
    nightly_subtotal = money(price_per_night * nights)
    cleaning_fee = max(MIN_CLEANING_FEE, money(nightly_subtotal * CLEANING_FEE_RATE))
    service_fee = money(nightly_subtotal * SERVICE_FEE_RATE)
    return {
        "nights": nights,
        "nightly_subtotal": nightly_subtotal,
        "cleaning_fee": cleaning_fee,
        "service_fee": service_fee,
        "total_price": money(nightly_subtotal + cleaning_fee + service_fee),
    }


def booking_options():
    return (
        selectinload(Booking.listing).selectinload(Listing.images),
    )


def get_booking(db: Session, booking_id: int) -> Booking | None:
    return db.scalar(select(Booking).options(*booking_options()).where(Booking.id == booking_id))


def create_booking(db: Session, payload: BookingCreate, guest: User) -> Booking:
    if guest.role not in {"guest", "both"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guest access is required to book a listing.")
    if payload.check_out <= payload.check_in:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="check_out must be after check_in.")

    listing = db.scalar(select(Listing).where(Listing.id == payload.listing_id))
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    if payload.guests > listing.max_guests:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guest count exceeds this listing's maximum.")
    if has_confirmed_booking_overlap(db, listing.id, payload.check_in, payload.check_out):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Listing is unavailable for the selected dates.")

    # Repeat the availability check immediately before insert so the service remains authoritative.
    db.expire_all()
    if has_confirmed_booking_overlap(db, listing.id, payload.check_in, payload.check_out):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Listing is unavailable for the selected dates.")

    pricing = calculate_price(listing.price_per_night, payload.check_in, payload.check_out)
    booking = Booking(
        listing_id=listing.id,
        guest_id=guest.id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        guests=payload.guests,
        nightly_price=listing.price_per_night,
        cleaning_fee=pricing["cleaning_fee"],
        service_fee=pricing["service_fee"],
        total_price=pricing["total_price"],
        status="confirmed",
    )
    db.add(booking)
    db.commit()
    saved_booking = get_booking(db, booking.id)
    if saved_booking is not None and saved_booking.status == "confirmed":
        try:
            send_booking_confirmation(saved_booking, guest.email)
        except Exception:
            # Email is a best-effort side effect after commit; never roll back or retry the booking.
            logger.warning("Booking confirmation email delivery failed for booking_id=%s.", saved_booking.id)
    return saved_booking


def cancel_booking(db: Session, booking: Booking) -> Booking:
    booking.status = "cancelled"
    db.commit()
    return get_booking(db, booking.id)
