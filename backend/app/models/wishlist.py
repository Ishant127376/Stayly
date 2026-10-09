from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

if TYPE_CHECKING:
    from app.models.listing import Listing
    from app.models.user import User


class Wishlist(Base):
    __tablename__ = "wishlists"
    __table_args__ = (UniqueConstraint("user_id", "listing_id", name="uq_wishlist_user_listing"),)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="wishlist_items")
    listing: Mapped["Listing"] = relationship(back_populates="wishlist_items")
