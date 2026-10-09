from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models import Listing, User, Wishlist
from app.schemas.wishlist import WishlistItemRead

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


def wishlist_response(item: Wishlist) -> WishlistItemRead:
    listing = item.listing
    return WishlistItemRead.model_validate({
        "user_id": item.user_id,
        "listing_id": item.listing_id,
        "created_at": item.created_at,
        "listing": {
            "id": listing.id,
            "title": listing.title,
            "city": listing.city,
            "country": listing.country,
            "price_per_night": listing.price_per_night,
            "rating": listing.rating,
            "images": [image.url for image in listing.images],
        },
    })


@router.get("", response_model=list[WishlistItemRead])
def list_wishlist(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[WishlistItemRead]:
    items = db.scalars(
        select(Wishlist)
        .options(selectinload(Wishlist.listing).selectinload(Listing.images))
        .where(Wishlist.user_id == user.id)
        .order_by(Wishlist.created_at.desc())
    ).all()
    return [wishlist_response(item) for item in items]


@router.post("/{listing_id}", response_model=WishlistItemRead, status_code=status.HTTP_201_CREATED)
def add_to_wishlist(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WishlistItemRead:
    listing = db.scalar(select(Listing).options(selectinload(Listing.images)).where(Listing.id == listing_id))
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    existing = db.scalar(select(Wishlist).where(Wishlist.user_id == user.id, Wishlist.listing_id == listing_id))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Listing is already in your wishlist.")
    item = Wishlist(user_id=user.id, listing_id=listing_id)
    db.add(item)
    db.commit()
    item = db.scalar(
        select(Wishlist)
        .options(selectinload(Wishlist.listing).selectinload(Listing.images))
        .where(Wishlist.user_id == user.id, Wishlist.listing_id == listing_id)
    )
    return wishlist_response(item)


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_wishlist(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    item = db.scalar(select(Wishlist).where(Wishlist.user_id == user.id, Wishlist.listing_id == listing_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing is not in your wishlist.")
    db.delete(item)
    db.commit()
