from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.database.session import Base
from app.models import Amenity, Listing, ListingAmenity, ListingImage, User, UserCredential
from app.seed import LISTING_DATA
from app.seed_demo_listings import DEMO_HOSTS, seed_demo_listings


def test_demo_listing_seed_is_idempotent():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as db:
            assert seed_demo_listings(db) == (4, 11, len(LISTING_DATA))
            assert seed_demo_listings(db) == (0, 0, 0)
            assert db.scalar(select(func.count(User.id))) == 4
            assert db.scalar(select(func.count(Amenity.id))) == 11
            assert db.scalar(select(func.count(Listing.id))) == len(LISTING_DATA)
            assert db.scalar(select(func.count(ListingImage.id))) == len(LISTING_DATA) * 3
            assert db.scalar(select(func.count(ListingAmenity.listing_id))) > 0
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_demo_listing_seed_preserves_existing_user_credentials_and_listing():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as db:
            existing_host = User(
                name="Existing Host Name",
                email=DEMO_HOSTS[0][1],
                role="host",
            )
            db.add(existing_host)
            db.flush()
            db.add(UserCredential(user_id=existing_host.id, password_hash="existing-hash"))
            existing_listing = Listing(
                host_id=existing_host.id,
                title=LISTING_DATA[0][0],
                description="Existing description must remain unchanged.",
                location="Existing location",
                city=LISTING_DATA[0][2],
                country="Existing country",
                property_type="villa",
                price_per_night=321,
                max_guests=2,
                bedrooms=1,
                beds=1,
                bathrooms=1,
                rating=0,
                review_count=0,
            )
            db.add(existing_listing)
            db.commit()
            existing_user_id = existing_host.id
            existing_listing_id = existing_listing.id

            assert seed_demo_listings(db) == (3, 11, len(LISTING_DATA) - 1)

            db.expire_all()
            preserved_user = db.get(User, existing_user_id)
            preserved_listing = db.get(Listing, existing_listing_id)
            assert preserved_user.name == "Existing Host Name"
            assert preserved_user.role == "host"
            assert db.get(UserCredential, existing_user_id).password_hash == "existing-hash"
            assert preserved_listing.description == "Existing description must remain unchanged."
            assert str(preserved_listing.price_per_night) == "321.00"
            assert preserved_listing.images == []
            assert preserved_listing.amenity_links == []
            assert db.scalar(select(func.count(Listing.id))) == len(LISTING_DATA)
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()
