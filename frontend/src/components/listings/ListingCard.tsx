"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Star } from "lucide-react";
import { useState } from "react";
import type { MouseEvent } from "react";

import { addToWishlist, removeFromWishlist } from "@/lib/api";
import type { Listing } from "@/types/listing";

type ListingCardProps = {
  listing: Listing;
  wishlisted?: boolean;
  priority?: boolean;
  onWishlistChange?: (listingId: number, active: boolean) => void;
};

const fallbackImage = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85";

export function ListingCard({ listing, wishlisted = false, priority = false, onWishlistChange }: ListingCardProps) {
  const [imageUrl, setImageUrl] = useState(listing.images[0]?.url ?? fallbackImage);
  const [imageFailed, setImageFailed] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(wishlisted);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  async function toggleWishlist(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (wishlistBusy) return;
    const nextValue = !isWishlisted;
    setIsWishlisted(nextValue);
    setWishlistBusy(true);
    try {
      if (nextValue) await addToWishlist(listing.id);
      else await removeFromWishlist(listing.id);
      onWishlistChange?.(listing.id, nextValue);
    } catch {
      setIsWishlisted(!nextValue);
    } finally {
      setWishlistBusy(false);
    }
  }

  return (
    <article className="listing-card">
      <Link href={`/listing/${listing.id}`} className="listing-card__link" aria-label={`View ${listing.title}`}>
        <div className="listing-image-wrap">
          {!imageFailed && <Image className="listing-image" src={imageUrl} alt={listing.title} fill priority={priority} loading={priority ? "eager" : "lazy"} sizes="(max-width: 640px) 94vw, (max-width: 820px) 46vw, (max-width: 1180px) 30vw, 22vw" onError={() => { if (imageUrl === fallbackImage) setImageFailed(true); else setImageUrl(fallbackImage); }} />}
          {imageFailed && <div className="image-fallback"><MapPin size={24} /><span>Photo unavailable</span></div>}
          <div className="image-scrim" />
          <button className={`wishlist-button ${isWishlisted ? "wishlist-button--active" : ""}`} type="button" onClick={toggleWishlist} disabled={wishlistBusy} aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={isWishlisted}>
            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="listing-card__body">
          <div className="listing-card__heading"><div className="listing-location"><MapPin size={14} /> <span>{listing.city}, {listing.country}</span></div>{Boolean(listing.rating) && <span className="card-rating" aria-label={`Rated ${Number(listing.rating).toFixed(1)} out of 5`}><Star size={13} fill="currentColor" /> {Number(listing.rating).toFixed(1)}</span>}</div>
          <h2>{listing.title}</h2>
          <p className="listing-meta">{listing.property_type} · {listing.max_guests} guests</p>
          <p className="listing-price"><strong>${Number(listing.price_per_night).toLocaleString()}</strong> night</p>
        </div>
      </Link>
    </article>
  );
}

export function ListingSkeleton() {
  return <div className="listing-skeleton" aria-hidden="true"><div className="skeleton-image" /><div className="skeleton-line skeleton-line--long" /><div className="skeleton-line skeleton-line--medium" /><div className="skeleton-line skeleton-line--short" /></div>;
}
