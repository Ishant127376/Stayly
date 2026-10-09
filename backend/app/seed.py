from datetime import date
from decimal import Decimal

from app.database.session import SessionLocal, reset_db
from app.models import Amenity, Booking, Listing, ListingAmenity, ListingImage, Review, User, Wishlist

IMAGE_BASE = "https://images.unsplash.com/"

AMENITY_NAMES = [
    "WiFi", "Kitchen", "Pool", "Parking", "Air conditioning", "TV", "Washer",
    "Workspace", "Beach access", "Mountain view", "Breakfast",
]

IMAGE_IDS = [
    "photo-1600607687939-ce8a6c25118c", "photo-1600566753190-17f0baa2a6c3",
    "photo-1600585154340-be6161a56a0c", "photo-1600047509807-ba8f99d2cdde",
    "photo-1613490493576-7fde63acd811", "photo-1512917774080-9991f1c4c750",
    "photo-1564013799919-ab600027ffc6", "photo-1571896349842-33c89424de2d",
    "photo-1544986581-efac024faf62", "photo-1522708323590-d24dbb6b0267",
    "photo-1505693416388-ac5ce068fe85", "photo-1494526585095-c41746248156",
    "photo-1500534623283-312aade485b7", "photo-1510798831971-661eb04b3739",
]

LISTING_DATA = [
    ("Sunrise Villa by the Sea", "Candolim, Goa", "Goa", "India", "villa", 185, 6, 3, 4, 3, 4.9, ["Pool", "Beach access", "Air conditioning", "WiFi"]),
    ("Quiet Cabin in the Pines", "Old Manali, Himachal Pradesh", "Manali", "India", "cabin", 92, 4, 2, 3, 1.5, 4.8, ["Mountain view", "Kitchen", "Workspace", "WiFi"]),
    ("Pink City Courtyard Home", "Bani Park, Jaipur", "Jaipur", "India", "house", 76, 5, 2, 3, 2, 4.7, ["Breakfast", "Air conditioning", "WiFi", "Parking"]),
    ("Sea Glass Apartment", "Bandra West, Mumbai", "Mumbai", "India", "apartment", 125, 3, 1, 2, 1, 4.6, ["Workspace", "WiFi", "TV", "Air conditioning"]),
    ("Garden Studio near Lodhi", "Central Delhi", "Delhi", "India", "apartment", 68, 2, 1, 1, 1, 4.5, ["Kitchen", "Workspace", "WiFi", "Washer"]),
    ("Backwater Coconut Cottage", "Alleppey, Kerala", "Alleppey", "India", "cottage", 110, 4, 2, 2, 2, 4.9, ["Breakfast", "Beach access", "Kitchen", "Parking"]),
    ("Ubud Rice Field Retreat", "Tegallalang, Bali", "Ubud", "Indonesia", "villa", 145, 4, 2, 2, 2, 4.8, ["Pool", "Breakfast", "Mountain view", "WiFi"]),
    ("Parisian Light-Filled Flat", "Le Marais, Paris", "Paris", "France", "apartment", 220, 4, 2, 2, 1, 4.7, ["Kitchen", "Washer", "TV", "Workspace"]),
    ("Cliffside Kerala Resort", "Varkala, Kerala", "Varkala", "India", "resort", 160, 3, 1, 2, 1, 4.6, ["Pool", "Beach access", "Breakfast", "Air conditioning"]),
    ("Modern Fort View Loft", "Amer Road, Jaipur", "Jaipur", "India", "apartment", 84, 3, 1, 2, 1, 4.4, ["Workspace", "WiFi", "Parking", "TV"]),
    ("Himalayan Glass House", "Kasol, Himachal Pradesh", "Kasol", "India", "cabin", 130, 4, 2, 2, 1, 4.9, ["Mountain view", "Kitchen", "WiFi"]),
    ("Juhu Beach Family Home", "Juhu, Mumbai", "Mumbai", "India", "house", 175, 7, 3, 4, 3, 4.5, ["Beach access", "Parking", "Kitchen", "Washer"]),
    ("South Goa Palm Cottage", "Palolem, Goa", "Goa", "India", "cottage", 105, 2, 1, 1, 1, 4.8, ["Beach access", "Air conditioning", "Breakfast", "WiFi"]),
    ("Bali Sunset Beach House", "Canggu, Bali", "Canggu", "Indonesia", "beachfront property", 205, 8, 4, 5, 4, 4.9, ["Pool", "Beach access", "Kitchen", "Parking"]),
    ("Montmartre Artist Cottage", "Montmartre, Paris", "Paris", "France", "cottage", 195, 2, 1, 1, 1, 4.6, ["Workspace", "Kitchen", "Washer", "TV"]),
]

DESCRIPTIONS = [
    "A bright, characterful stay designed for slow mornings, local discoveries, and comfortable evenings.",
    "A thoughtfully furnished retreat with generous windows, calm surroundings, and everything needed for a memorable stay.",
    "Set in a lively neighborhood with a relaxed home base, this space combines local charm with modern comforts.",
]


def image_url(image_id: str) -> str:
    return f"{IMAGE_BASE}{image_id}?auto=format&fit=crop&w=1200&q=85"


def seed_database() -> None:
    reset_db()
    db = SessionLocal()
    try:
        hosts = [
            User(name="Ananya Rao", email="ananya.host@example.com", avatar="https://i.pravatar.cc/150?img=47", role="host"),
            User(name="Mateo Silva", email="mateo.host@example.com", avatar="https://i.pravatar.cc/150?img=12", role="host"),
            User(name="Priya Menon", email="priya.host@example.com", avatar="https://i.pravatar.cc/150?img=32", role="host"),
            User(name="Camille Laurent", email="camille.host@example.com", avatar="https://i.pravatar.cc/150?img=44", role="host"),
        ]
        guests = [
            User(name="Rohan Shah", email="rohan.guest@example.com", avatar="https://i.pravatar.cc/150?img=11", role="both"),
            User(name="Maya Patel", email="maya.guest@example.com", avatar="https://i.pravatar.cc/150?img=5", role="guest"),
            User(name="Arjun Kapoor", email="arjun.guest@example.com", avatar="https://i.pravatar.cc/150?img=13", role="guest"),
            User(name="Sofia Martin", email="sofia.guest@example.com", avatar="https://i.pravatar.cc/150?img=49", role="guest"),
        ]
        db.add_all(hosts + guests)
        db.flush()

        amenities = {name: Amenity(name=name) for name in AMENITY_NAMES}
        db.add_all(amenities.values())
        db.flush()

        listings: list[Listing] = []
        for index, data in enumerate(LISTING_DATA):
            title, location, city, country, property_type, price, max_guests, bedrooms, beds, bathrooms, rating, amenity_names = data
            listing = Listing(
                host_id=guests[0].id if index == 9 else hosts[index % len(hosts)].id,
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
            listing.amenity_links.extend(ListingAmenity(amenity=amenities[name]) for name in amenity_names)
            listing.images.extend(
                ListingImage(url=image_url(IMAGE_IDS[(index + image_index) % len(IMAGE_IDS)]), display_order=image_index)
                for image_index in range(3)
            )
            listings.append(listing)
        db.add_all(listings)
        db.flush()

        reviews = [
            Review(listing_id=listings[0].id, user_id=guests[0].id, rating=5, comment="Beautiful home, wonderful host, and an unbeatable morning view."),
            Review(listing_id=listings[0].id, user_id=guests[1].id, rating=5, comment="Exactly as pictured and close to the best beaches."),
            Review(listing_id=listings[1].id, user_id=guests[2].id, rating=5, comment="The cabin was peaceful, warm, and perfect for a mountain weekend."),
            Review(listing_id=listings[2].id, user_id=guests[3].id, rating=4, comment="A lovely base for exploring Jaipur with thoughtful details."),
            Review(listing_id=listings[7].id, user_id=guests[0].id, rating=5, comment="Fantastic location and beautiful light throughout the flat."),
            Review(listing_id=listings[13].id, user_id=guests[1].id, rating=3, comment="Great pool and views; the road nearby was busier than expected."),
        ]
        db.add_all(reviews)
        for listing in listings:
            listing.review_count = sum(review.listing_id == listing.id for review in reviews)

        bookings = [
            Booking(listing_id=listings[0].id, guest_id=guests[0].id, check_in=date(2026, 10, 16), check_out=date(2026, 10, 19), guests=2, nightly_price=Decimal("185"), cleaning_fee=Decimal("45"), service_fee=Decimal("28"), total_price=Decimal("628"), status="confirmed"),
            Booking(listing_id=listings[0].id, guest_id=guests[1].id, check_in=date(2026, 10, 16), check_out=date(2026, 10, 19), guests=2, nightly_price=Decimal("185"), cleaning_fee=Decimal("45"), service_fee=Decimal("28"), total_price=Decimal("628"), status="cancelled"),
            Booking(listing_id=listings[1].id, guest_id=guests[2].id, check_in=date(2026, 11, 2), check_out=date(2026, 11, 6), guests=3, nightly_price=Decimal("92"), cleaning_fee=Decimal("30"), service_fee=Decimal("22"), total_price=Decimal("420"), status="confirmed"),
            Booking(listing_id=listings[7].id, guest_id=guests[3].id, check_in=date(2026, 12, 20), check_out=date(2026, 12, 24), guests=2, nightly_price=Decimal("220"), cleaning_fee=Decimal("50"), service_fee=Decimal("45"), total_price=Decimal("975"), status="confirmed"),
            Booking(listing_id=listings[13].id, guest_id=guests[0].id, check_in=date(2026, 10, 28), check_out=date(2026, 11, 2), guests=4, nightly_price=Decimal("205"), cleaning_fee=Decimal("60"), service_fee=Decimal("50"), total_price=Decimal("1135"), status="confirmed"),
            Booking(listing_id=listings[2].id, guest_id=guests[3].id, check_in=date(2026, 10, 22), check_out=date(2026, 10, 25), guests=2, nightly_price=Decimal("76"), cleaning_fee=Decimal("25"), service_fee=Decimal("18"), total_price=Decimal("271"), status="cancelled"),
        ]
        db.add_all(bookings)
        db.add_all([
            Wishlist(user_id=guests[0].id, listing_id=listings[6].id),
            Wishlist(user_id=guests[0].id, listing_id=listings[13].id),
            Wishlist(user_id=guests[1].id, listing_id=listings[0].id),
            Wishlist(user_id=guests[3].id, listing_id=listings[7].id),
        ])
        db.commit()

        print("Database initialized")
        print(f"Users created: {len(hosts) + len(guests)}")
        print(f"Listings created: {len(listings)}")
        print(f"Bookings created: {len(bookings)}")
        print(f"Reviews created: {len(reviews)}")
        print(f"Amenities created: {len(amenities)}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
