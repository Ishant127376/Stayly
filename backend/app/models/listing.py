from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.ext.associationproxy import AssociationProxy, association_proxy
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base
from app.models.listing_amenity import ListingAmenity

if TYPE_CHECKING:
    from app.models.amenity import Amenity
    from app.models.booking import Booking
    from app.models.listing_amenity import ListingAmenity
    from app.models.listing_image import ListingImage
    from app.models.review import Review
    from app.models.user import User
    from app.models.wishlist import Wishlist


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint("price_per_night >= 0", name="ck_listing_price_non_negative"),
        CheckConstraint("max_guests > 0", name="ck_listing_max_guests_positive"),
        CheckConstraint("bedrooms >= 0", name="ck_listing_bedrooms_non_negative"),
        CheckConstraint("beds >= 0", name="ck_listing_beds_non_negative"),
        CheckConstraint("bathrooms >= 0", name="ck_listing_bathrooms_non_negative"),
        CheckConstraint("rating >= 0 AND rating <= 5", name="ck_listing_rating_range"),
        Index("ix_listings_location_city", "location", "city"),
        Index("ix_listings_property_type", "property_type"),
        Index("ix_listings_price_per_night", "price_per_night"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    property_type: Mapped[str] = mapped_column(String(50), nullable=False)
    price_per_night: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    max_guests: Mapped[int] = mapped_column(nullable=False)
    bedrooms: Mapped[int] = mapped_column(nullable=False, default=1)
    beds: Mapped[int] = mapped_column(nullable=False, default=1)
    bathrooms: Mapped[Decimal] = mapped_column(Numeric(3, 1), nullable=False, default=1)
    rating: Mapped[Decimal] = mapped_column(Numeric(2, 1), nullable=False, default=0)
    review_count: Mapped[int] = mapped_column(nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    host: Mapped["User"] = relationship(back_populates="listings")
    images: Mapped[list["ListingImage"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan", order_by="ListingImage.display_order"
    )
    amenity_links: Mapped[list["ListingAmenity"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan"
    )
    amenities: AssociationProxy[list["Amenity"]] = association_proxy(
        "amenity_links", "amenity", creator=lambda amenity: ListingAmenity(amenity=amenity)
    )
    bookings: Mapped[list["Booking"]] = relationship(back_populates="listing")
    reviews: Mapped[list["Review"]] = relationship(back_populates="listing")
    wishlist_items: Mapped[list["Wishlist"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan"
    )
