from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.database.session import Base
from app.models import Booking, Listing, User
from app.routers.listings import listing_destinations, list_listings
from app.seed import LISTING_DATA
from app.seed_demo_listings import seed_demo_listings


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as session:
            seed_demo_listings(session)
            yield session
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def search(db, location, **kwargs):
    params = {
        "location": location,
        "check_in": None,
        "check_out": None,
        "guests": None,
        "min_price": None,
        "max_price": None,
        "property_type": None,
        "amenities": None,
        "minimum_rating": None,
        "page": 1,
        "limit": 12,
        "sort": "newest",
    }
    params.update(kwargs)
    return list_listings(db=db, **params)


def test_destination_search_matches_seeded_cities_case_insensitively(db):
    expected = {"Goa": 2, "Paris": 2, "Jaipur": 2}
    for query, count in expected.items():
        results = search(db, query)
        assert results.total == count
        assert {item.city for item in results.items} == {query}

    partial_case_insensitive = search(db, "jAi")
    assert partial_case_insensitive.total == 2
    assert {item.city for item in partial_case_insensitive.items} == {"Jaipur"}


def test_clearing_destination_restores_all_listings(db):
    results = search(db, "", limit=50)
    assert results.total == len(LISTING_DATA)
    assert len(results.items) == len(LISTING_DATA)


def test_destination_search_preserves_filters_and_pagination(db):
    goa_listing = db.scalar(select(Listing).where(Listing.title == "Sunrise Villa by the Sea"))
    guest = db.scalar(select(User).where(User.email == "ananya.host@example.com"))
    db.add(Booking(
        listing_id=goa_listing.id,
        guest_id=guest.id,
        check_in=date(2026, 10, 16),
        check_out=date(2026, 10, 19),
        guests=2,
        nightly_price=Decimal("185"),
        cleaning_fee=Decimal("45"),
        service_fee=Decimal("28"),
        total_price=Decimal("628"),
        status="confirmed",
    ))
    db.commit()
    filtered = search(
        db,
        "gOa",
        check_in=date(2026, 10, 17),
        check_out=date(2026, 10, 18),
        guests=2,
        max_price=120,
        property_type="cottage",
        amenities="Beach access",
        minimum_rating=4.7,
    )
    assert filtered.total == 1
    assert filtered.items[0].title == "South Goa Palm Cottage"

    page_two = search(db, "Goa", page=2, limit=1)
    assert page_two.total == 2
    assert page_two.page == 2
    assert len(page_two.items) == 1


def test_destination_suggestions_are_derived_and_partially_filtered(db):
    all_destinations = listing_destinations(db=db)
    assert len(all_destinations) == 11
    assert all_destinations == listing_destinations(db=db, q="")
    assert [item.city for item in listing_destinations(db=db, q="GO")] == ["Goa"]
    assert [item.city for item in listing_destinations(db=db, q="par")] == ["Paris"]
    assert [item.city for item in listing_destinations(db=db, q="jai")] == ["Jaipur"]
    assert listing_destinations(db=db, q="Atlantis") == []
