from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.amenity import Amenity
    from app.models.listing import Listing


class ListingAmenity(Base):
    __tablename__ = "listing_amenities"
    __table_args__ = (UniqueConstraint("listing_id", "amenity_id", name="uq_listing_amenity"),)

    listing_id: Mapped[int] = mapped_column(
        ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True
    )
    amenity_id: Mapped[int] = mapped_column(
        ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True
    )

    listing: Mapped["Listing"] = relationship(back_populates="amenity_links")
    amenity: Mapped["Amenity"] = relationship(back_populates="listing_links")
