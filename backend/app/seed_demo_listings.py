"""Add demo hosts, amenities, and public listings without changing existing data.

Run explicitly from ``backend/`` with its configured DATABASE_URL:
    python -m app.seed_demo_listings
"""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import SessionLocal, init_db
from app.models import Amenity, Listing, ListingAmenity, ListingImage, User
from app.seed import AMENITY_NAMES, DESCRIPTIONS, IMAGE_IDS, LISTING_DATA, image_url

DEMO_HOSTS = [
    ("Ananya Rao", "ananya.host@example.com", "https://i.pravatar.cc/150?img=47"),
    ("Mateo Silva", "mateo.host@example.com", "https://i.pravatar.cc/150?img=12"),
    ("Priya Menon", "priya.host@example.com", "https://i.pravatar.cc/150?img=32"),
    ("Camille Laurent", "camille.host@example.com", "https://i.pravatar.cc/150?img=44"),
]


def seed_demo_listings(db: Session) -> tuple[int, int, int]:
    """Insert missing demo data atomically; return created hosts, amenities, listings."""
    created_hosts = created_amenities = created_listings = 0
    try:
        hosts: list[User] = []
        for name, email, avatar in DEMO_HOSTS:
            host = db.scalar(select(User).where(User.email == email))
            if host is None:
                host = User(name=name, email=email, avatar=avatar, role="host")
                db.add(host)
                db.flush()
                created_hosts += 1
            elif host.role not in {"host", "both"}:
                raise ValueError(f"Existing demo account {email} is not authorized as a host; no role was changed.")
            hosts.append(host)

        amenities: dict[str, Amenity] = {}
        for name in AMENITY_NAMES:
            amenity = db.scalar(select(Amenity).where(Amenity.name == name))
            if amenity is None:
                amenity = Amenity(name=name)
                db.add(amenity)
                db.flush()
                created_amenities += 1
            amenities[name] = amenity

        for index, data in enumerate(LISTING_DATA):
            title, location, city, country, property_type, price, max_guests, bedrooms, beds, bathrooms, rating, amenity_names = data
            existing = db.scalar(select(Listing.id).where(Listing.title == title, Listing.city == city))
            if existing is not None:
                continue

            listing = Listing(
                host_id=hosts[index % len(hosts)].id,
                title=title,
                description=DESCRIPTIONS[index % len(DESCRIPTIONS)],
                location=location,
                city=city,
                country=country,
                latitude=Decimal("15.4909") if city == "Goa" else None,
                longitude=Decimal("73.8278") if city == "Goa" else None,
                property_type=property_type,
                price_per_night=Decimal(price),
                max_guests=max_guests,
                bedrooms=bedrooms,
                beds=beds,
                bathrooms=Decimal(str(bathrooms)),
                rating=Decimal(str(rating)),
                review_count=0,
            )
            listing.amenity_links.extend(
                ListingAmenity(amenity=amenities[name]) for name in amenity_names
            )
            listing.images.extend(
                ListingImage(
                    url=image_url(IMAGE_IDS[(index + image_index) % len(IMAGE_IDS)]),
                    display_order=image_index,
                )
                for image_index in range(3)
            )
            db.add(listing)
            created_listings += 1

        db.commit()
        return created_hosts, created_amenities, created_listings
    except Exception:
        db.rollback()
        raise


def main() -> None:
    # create_all is additive; this script never drops tables or deletes rows.
    init_db()
    with SessionLocal() as db:
        hosts, amenities, listings = seed_demo_listings(db)
    print(f"Demo data added: {hosts} hosts, {amenities} amenities, {listings} listings.")


if __name__ == "__main__":
    main()
