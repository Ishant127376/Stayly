"use client";

import Image from "next/image";
import { Heart, MapPin, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { ApiError, getWishlist, removeFromWishlist } from "@/lib/api";
import type { SearchFilters, WishlistItem } from "@/types/listing";

const emptyFilters: SearchFilters = { location: "", check_in: "", check_out: "", guests: null, min_price: "", max_price: "", property_type: "", amenities: [], minimum_rating: "", page: 1 };

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<number | null>(null);

  function loadWishlist() {
    setLoading(true);
    setError("");
    getWishlist(true).then(setItems).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : "We could not load your wishlist.")).finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = window.setTimeout(loadWishlist, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function remove(listingId: number) {
    if (removing) return;
    setRemoving(listingId);
    try { await removeFromWishlist(listingId); setItems((current) => current.filter((item) => item.listing_id !== listingId)); }
    catch (reason: unknown) { setError(reason instanceof ApiError ? reason.message : "We could not remove that stay."); }
    finally { setRemoving(null); }
  }

  return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="wishlist-page"><div className="wishlist-container"><div className="wishlist-heading"><div><span className="eyebrow">Saved stays</span><h1>Wishlist</h1><p>Keep the places you want to come back to.</p></div><Heart size={30} /></div>{loading ? <div className="listing-grid">{Array.from({ length: 4 }, (_, index) => <div className="listing-skeleton" key={index}><div className="skeleton-image" /><div className="skeleton-line skeleton-line--long" /></div>)}</div> : error ? <div className="empty-state"><span className="state-icon state-icon--error"><Heart size={25} /></span><h2>Wishlist unavailable</h2><p>{error}</p><button className="primary-button" type="button" onClick={loadWishlist}>Try again</button></div> : items.length ? <div className="wishlist-grid">{items.map((item) => <WishlistCard key={item.listing_id} item={item} onRemove={remove} removing={removing === item.listing_id} />)}</div> : <div className="empty-state"><span className="state-icon"><Heart size={25} /></span><h2>Your wishlist is waiting</h2><p>Save stays you love and find them here later.</p><Link className="primary-button" href="/">Explore stays</Link></div>}</div></main></>;
}

function WishlistCard({ item, onRemove, removing }: { item: WishlistItem; onRemove: (listingId: number) => void; removing: boolean }) {
  return <article className="wishlist-card"><Link className="wishlist-card-image" href={`/listing/${item.listing_id}`}>{item.listing.images[0] && <Image src={item.listing.images[0]} alt={item.listing.title} fill sizes="(max-width: 700px) 94vw, (max-width: 1100px) 45vw, 300px" />}</Link><div className="wishlist-card-body"><div className="wishlist-card-heading"><div><h2>{item.listing.title}</h2><p><MapPin size={14} /> {item.listing.city}, {item.listing.country}</p></div><span><Star size={14} fill="currentColor" /> {Number(item.listing.rating).toFixed(1)}</span></div><p className="wishlist-price"><strong>${Number(item.listing.price_per_night).toLocaleString()}</strong> night</p><button className="remove-wishlist-button" type="button" onClick={() => onRemove(item.listing_id)} disabled={removing}><Trash2 size={14} /> {removing ? "Removing..." : "Remove"}</button></div></article>;
}
