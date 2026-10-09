from datetime import date
from math import ceil
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import and_, delete, distinct, exists, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Amenity, Booking, Listing, ListingAmenity, ListingImage, Review, User
from app.schemas.listing import ListingCreate, ListingUpdate
from app.services.availability import confirmed_booking_overlap_condition


def listing_options():
    return (
        selectinload(Listing.host),
        selectinload(Listing.images),
        selectinload(Listing.amenity_links).selectinload(ListingAmenity.amenity),
    )


def get_listing(db: Session, listing_id: int) -> Listing | None:
    statement = select(Listing).options(*listing_options()).where(Listing.id == listing_id)
    return db.scalar(statement)


def list_destinations(db: Session, query: str | None = None) -> list[tuple[str, str]]:
    statement = select(Listing.city, Listing.country).distinct()
    if query and query.strip():
        pattern = f"%{query.strip()}%"
        statement = statement.where(
            or_(Listing.city.ilike(pattern), Listing.country.ilike(pattern))
        )
    return list(db.execute(statement.order_by(Listing.city, Listing.country)).tuples().all())


def search_listings(
    db: Session,
    *,
    location: str | None,
    check_in: date | None,
    check_out: date | None,
    guests: int | None,
    min_price,
    max_price,
    property_type: str | None,
    amenities: Sequence[str],
    minimum_rating,
    page: int,
    limit: int,
    sort: str,
) -> tuple[list[Listing], int]:
    statement = select(Listing).options(*listing_options())
    filters = []
    if location:
        normalized_location = location.strip().casefold()
        pattern = f"%{normalized_location}%"
        filters.append(or_(
            func.lower(Listing.location).like(pattern),
            func.lower(Listing.city).like(pattern),
            func.lower(Listing.country).like(pattern),
        ))
    if guests is not None:
        filters.append(Listing.max_guests >= guests)
    if min_price is not None:
        filters.append(Listing.price_per_night >= min_price)
    if max_price is not None:
        filters.append(Listing.price_per_night <= max_price)
    if property_type:
        filters.append(Listing.property_type.ilike(property_type.strip()))
    if minimum_rating is not None:
        filters.append(Listing.rating >= minimum_rating)
    if amenities:
        amenity_names = [name.strip() for name in amenities if name.strip()]
        if amenity_names:
            amenity_listing_ids = (
                select(ListingAmenity.listing_id)
                .join(Amenity, Amenity.id == ListingAmenity.amenity_id)
                .where(func.lower(Amenity.name).in_([name.casefold() for name in amenity_names]))
                .group_by(ListingAmenity.listing_id)
                .having(func.count(distinct(Amenity.id)) == len(set(amenity_names)))
            )
            filters.append(Listing.id.in_(amenity_listing_ids))
    if check_in and check_out:
        blocked = select(Booking.id).where(
            Booking.listing_id == Listing.id,
            confirmed_booking_overlap_condition(check_in, check_out),
        )
        filters.append(~exists(blocked))
    if filters:
        statement = statement.where(and_(*filters))

    if sort == "price_low":
        statement = statement.order_by(Listing.price_per_night.asc())
    elif sort == "price_high":
        statement = statement.order_by(Listing.price_per_night.desc())
    elif sort == "rating":
        statement = statement.order_by(Listing.rating.desc(), Listing.review_count.desc())
    elif sort == "newest":
        statement = statement.order_by(Listing.created_at.desc())
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported sort option.")

    count_statement = select(func.count()).select_from(statement.order_by(None).subquery())
    total = db.scalar(count_statement) or 0
    items = list(db.scalars(statement.offset((page - 1) * limit).limit(limit)).unique().all())
    return items, total


def _amenities_by_name(db: Session, names: list[str]) -> list[Amenity]:
    normalized = list(dict.fromkeys(name.strip() for name in names if name.strip()))
    if not normalized:
        return []
    existing = {
        amenity.name.casefold(): amenity
        for amenity in db.scalars(
            select(Amenity).where(func.lower(Amenity.name).in_([name.casefold() for name in normalized]))
        ).all()
    }
    result = []
    for name in normalized:
        amenity = existing.get(name.casefold())
        if amenity is None:
            amenity = Amenity(name=name)
            db.add(amenity)
            db.flush()
        result.append(amenity)
    return result


def create_listing(db: Session, payload: ListingCreate, host: User) -> Listing:
    listing = Listing(
        host_id=host.id,
        title=payload.title,
        description=payload.description,
        location=payload.location,
        city=payload.city,
        country=payload.country,
        latitude=payload.latitude,
        longitude=payload.longitude,
        property_type=payload.property_type,
        price_per_night=payload.price_per_night,
        max_guests=payload.max_guests,
        bedrooms=payload.bedrooms,
        beds=payload.beds,
        bathrooms=payload.bathrooms,
        rating=0,
        review_count=0,
    )
    listing.images = [ListingImage(url=url, display_order=index) for index, url in enumerate(payload.images)]
    listing.amenity_links = [ListingAmenity(amenity=amenity) for amenity in _amenities_by_name(db, payload.amenities)]
    db.add(listing)
    db.commit()
    return get_listing(db, listing.id)


def update_listing(db: Session, listing: Listing, payload: ListingUpdate) -> Listing:
    values = payload.model_dump(exclude_unset=True)
    image_urls = values.pop("images", None)
    amenity_names = values.pop("amenities", None)
    for field, value in values.items():
        setattr(listing, field, value)
    if image_urls is not None:
        listing.images.clear()
        listing.images.extend(ListingImage(url=url, display_order=index) for index, url in enumerate(image_urls))
    if amenity_names is not None:
        listing.amenity_links.clear()
        listing.amenity_links.extend(
            ListingAmenity(amenity=amenity) for amenity in _amenities_by_name(db, amenity_names)
        )
    db.commit()
    return get_listing(db, listing.id)


def delete_listing(db: Session, listing: Listing) -> None:
    if listing.bookings or listing.reviews:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Listings with booking or review history cannot be deleted.",
        )
    db.delete(listing)
    db.commit()
