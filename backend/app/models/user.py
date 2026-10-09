from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, String, func
from sqlalchemy.ext.associationproxy import AssociationProxy, association_proxy
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base
from app.models.wishlist import Wishlist

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.listing import Listing
    from app.models.review import Review
    from app.models.wishlist import Wishlist


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('guest', 'host', 'both')", name="ck_user_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    avatar: Mapped[str | None] = mapped_column(String(500))
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="guest")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    listings: Mapped[list["Listing"]] = relationship(back_populates="host")
    bookings: Mapped[list["Booking"]] = relationship(back_populates="guest")
    reviews: Mapped[list["Review"]] = relationship(back_populates="user")
    wishlist_items: Mapped[list["Wishlist"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    wishlist_listings: AssociationProxy[list["Listing"]] = association_proxy(
        "wishlist_items", "listing", creator=lambda listing: Wishlist(listing=listing)
    )
