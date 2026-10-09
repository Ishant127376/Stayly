from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.database.session import SessionLocal
from app.models import Booking, Listing, ListingAmenity, ListingImage, User
from app.schemas.booking import BookingBase
from app.seed import seed_database
from app.services.availability import has_confirmed_booking_overlap


@pytest.fixture(autouse=True)
def seeded_database():
    seed_database()
    yield


def test_seed_counts_and_relationships():
    db = SessionLocal()
    try:
        assert db.scalar(select(func.count()).select_from(User)) == 8
        assert db.scalar(select(func.count()).select_from(Listing)) == 15
        assert db.scalar(select(func.count()).select_from(ListingImage)) == 45

        listing = db.scalar(select(Listing).where(Listing.id == 1))
        assert listing.host.role == "host"
        assert len(listing.images) == 3
        assert len(listing.amenities) == 4
    finally:
        db.close()


def test_confirmed_only_overlap_and_date_validation():
    db = SessionLocal()
    try:
        assert has_confirmed_booking_overlap(db, 1, date(2026, 10, 17), date(2026, 10, 18))
        assert not has_confirmed_booking_overlap(db, 3, date(2026, 10, 22), date(2026, 10, 25))
        BookingBase(listing_id=1, check_in=date(2026, 10, 20), check_out=date(2026, 10, 21), guests=1)
        with pytest.raises(ValueError):
            BookingBase(listing_id=1, check_in=date(2026, 10, 21), check_out=date(2026, 10, 21), guests=1)
    finally:
        db.close()


def test_unique_email_and_listing_child_cleanup():
    db = SessionLocal()
    try:
        db.add(User(name="Duplicate", email="ananya.host@example.com", role="guest"))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

        temporary = Listing(
            host_id=1,
            title="Temporary",
            description="Temporary",
            location="Test",
            city="Test",
            country="Test",
            property_type="house",
            price_per_night=10,
            max_guests=1,
            bedrooms=0,
            beds=1,
            bathrooms=1,
            rating=0,
            review_count=0,
        )
        temporary.images.append(ListingImage(url="https://example.com/test.jpg", display_order=0))
        temporary.amenity_links.append(ListingAmenity(amenity_id=1))
        db.add(temporary)
        db.commit()
        temporary_id = temporary.id

        db.delete(temporary)
        db.commit()
        assert db.scalar(select(func.count()).select_from(ListingImage).where(ListingImage.listing_id == temporary_id)) == 0
        assert db.scalar(select(func.count()).select_from(ListingAmenity).where(ListingAmenity.listing_id == temporary_id)) == 0
    finally:
        db.close()