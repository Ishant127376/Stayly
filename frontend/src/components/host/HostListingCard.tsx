"use client";

import Image from "next/image";
import { Edit3, ExternalLink, MapPin, Star, Trash2 } from "lucide-react";
import Link from "next/link";

import type { Listing } from "@/types/listing";

type Props = { listing: Listing; onDelete: (listing: Listing) => void };

export function HostListingCard({ listing, onDelete }: Props) {
  return <article className="host-listing-card"><Link className="host-listing-image" style={{ position: "relative" }} href={`/listing/${listing.id}`}>{listing.images[0] && <Image src={listing.images[0].url} alt={listing.title} fill priority sizes="(max-width: 700px) 94vw, (max-width: 1100px) 45vw, 300px" />}</Link><div className="host-listing-body"><div className="host-listing-heading"><div><span className="status-pill">{listing.property_type}</span><h3>{listing.title}</h3><p><MapPin size={14} /> {listing.city}, {listing.country}</p></div><span className="host-rating"><Star size={14} fill="currentColor" /> {Number(listing.rating).toFixed(1)}</span></div><div className="host-listing-meta"><span>${Number(listing.price_per_night).toLocaleString()} / night</span><span>{listing.max_guests} guests</span><span>{listing.review_count} reviews</span></div><div className="host-listing-actions"><Link className="outline-button" href={`/listing/${listing.id}`}><ExternalLink size={14} /> View</Link><Link className="outline-button" href={`/host/listings/${listing.id}/edit`}><Edit3 size={14} /> Edit</Link><button className="delete-listing-button" type="button" onClick={() => onDelete(listing)}><Trash2 size={14} /> Delete</button></div></div></article>;
}
