from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, select
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models import Booking, Listing, User
from app.schemas.booking import BookingCreate, BookingWithListing
from app.services import bookings as booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingWithListing, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Booking:
    return booking_service.create_booking(db, payload, user)


@router.get("/my-trips", response_model=list[BookingWithListing])
def my_trips(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Booking]:
    today = date.today()
    upcoming_first = case((Booking.check_out >= today, 0), else_=1)
    return list(db.scalars(
        select(Booking)
        .options(selectinload(Booking.listing).selectinload(Listing.images))
        .where(Booking.guest_id == user.id)
        .order_by(upcoming_first, Booking.check_in.asc(), Booking.created_at.desc())
    ).all())


@router.get("/{booking_id}", response_model=BookingWithListing)
def read_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Booking:
    booking = booking_service.get_booking(db, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if booking.guest_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this booking.")
    return booking


@router.delete("/{booking_id}", response_model=BookingWithListing)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Booking:
    booking = booking_service.get_booking(db, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if booking.guest_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this booking.")
    if booking.status == "cancelled":
        return booking
    return booking_service.cancel_booking(db, booking)


