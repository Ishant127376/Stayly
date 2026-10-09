from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user, require_host
from app.database.session import get_db
from app.models import Booking, Listing, Review, User
from app.schemas.booking import BookingHostRead
from app.schemas.listing import AvailabilityRead, BlockedRange, ListingCreate, ListingPage, ListingRead, ListingUpdate
from app.schemas.review import ReviewCreate, ReviewWithUser
from app.services import listings as listing_service

router = APIRouter(prefix="/listings", tags=["listings"])


def validate_search_dates(check_in: date | None, check_out: date | None) -> None:
    if (check_in is None) != (check_out is None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="check_in and check_out must be provided together.")
    if check_in and check_out and check_out <= check_in:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="check_out must be after check_in.")


@router.get("", response_model=ListingPage)
def list_listings(
    location: str | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int | None = Query(default=None, gt=0),
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    property_type: str | None = None,
    amenities: str | None = None,
    minimum_rating: Decimal | None = Query(default=None, ge=0, le=5),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=12, ge=1, le=50),
    sort: str = "newest",
    db: Session = Depends(get_db),
) -> ListingPage:
    validate_search_dates(check_in, check_out)
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="min_price cannot exceed max_price.")
    items, total = listing_service.search_listings(
        db,
        location=location,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        min_price=min_price,
        max_price=max_price,
        property_type=property_type,
        amenities=amenities.split(",") if amenities else [],
        minimum_rating=minimum_rating,
        page=page,
        limit=limit,
        sort=sort,
    )
    return ListingPage(items=items, page=page, limit=limit, total=total, pages=(total + limit - 1) // limit)


@router.post("", response_model=ListingRead, status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: ListingCreate,
    db: Session = Depends(get_db),
    host: User = Depends(require_host),
) -> Listing:
    return listing_service.create_listing(db, payload, host)


@router.get("/{listing_id}", response_model=ListingRead)
def read_listing(listing_id: int, db: Session = Depends(get_db)) -> Listing:
    listing = listing_service.get_listing(db, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    return listing


@router.put("/{listing_id}", response_model=ListingRead)
def edit_listing(
    listing_id: int,
    payload: ListingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_host),
) -> Listing:
    listing = listing_service.get_listing(db, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    if listing.host_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this listing.")
    return listing_service.update_listing(db, listing, payload)


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_host),
) -> None:
    listing = listing_service.get_listing(db, listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    if listing.host_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this listing.")
    listing_service.delete_listing(db, listing)


@router.get("/{listing_id}/availability", response_model=AvailabilityRead)
def listing_availability(listing_id: int, db: Session = Depends(get_db)) -> AvailabilityRead:
    listing = db.scalar(select(Listing).where(Listing.id == listing_id))
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    bookings = db.scalars(
        select(Booking)
        .where(Booking.listing_id == listing_id, Booking.status == "confirmed")
        .order_by(Booking.check_in)
    ).all()
    return AvailabilityRead(
        listing_id=listing_id,
        blocked_ranges=[BlockedRange(check_in=booking.check_in, check_out=booking.check_out) for booking in bookings],
    )


@router.get("/{listing_id}/reviews", response_model=list[ReviewWithUser])
def listing_reviews(listing_id: int, db: Session = Depends(get_db)) -> list[Review]:
    if db.scalar(select(Listing.id).where(Listing.id == listing_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    return list(db.scalars(
        select(Review)
        .options(selectinload(Review.user))
        .where(Review.listing_id == listing_id)
        .order_by(Review.created_at.desc())
    ).all())


@router.post("/{listing_id}/reviews", response_model=ReviewWithUser, status_code=status.HTTP_201_CREATED)
def create_review(
    listing_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Review:
    listing = db.scalar(select(Listing).where(Listing.id == listing_id))
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    eligible = db.scalar(select(Booking.id).where(
        Booking.listing_id == listing_id,
        Booking.guest_id == user.id,
        Booking.status == "confirmed",
        Booking.check_out <= date.today(),
    ))
    if eligible is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="A completed confirmed stay is required to review this listing.")
    if db.scalar(select(Review.id).where(Review.listing_id == listing_id, Review.user_id == user.id)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already reviewed this listing.")
    review = Review(listing_id=listing_id, user_id=user.id, rating=payload.rating, comment=payload.comment.strip())
    db.add(review)
    db.flush()
    average, count = db.execute(select(func.avg(Review.rating), func.count(Review.id)).where(Review.listing_id == listing_id)).one()
    listing.rating = round(float(average or 0), 1)
    listing.review_count = count
    db.commit()
    return db.scalar(select(Review).options(selectinload(Review.user)).where(Review.id == review.id))


@router.get("/{listing_id}/bookings", response_model=list[BookingHostRead])
def listing_bookings(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_host),
) -> list[Booking]:
    listing = db.scalar(select(Listing).where(Listing.id == listing_id))
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    if listing.host_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this listing.")
    return list(db.scalars(
        select(Booking)
        .options(selectinload(Booking.guest))
        .where(Booking.listing_id == listing_id)
        .order_by(Booking.check_in)
    ).all())
