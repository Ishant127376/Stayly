"use client";

import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { ListingForm } from "@/components/host/ListingForm";
import { ApiError, createListing, getCurrentUser, getListing, updateListing } from "@/lib/api";
import type { Listing, ListingPayload, SearchFilters, User } from "@/types/listing";

const emptyFilters: SearchFilters = { location: "", check_in: "", check_out: "", guests: null, min_price: "", max_price: "", property_type: "", amenities: [], minimum_rating: "", page: 1 };

type Props = { listingId?: number };

export function ListingEditor({ listingId }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editing = Boolean(listingId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      Promise.all([getCurrentUser(true), listingId ? getListing(listingId) : Promise.resolve(null)]).then(([currentUser, currentListing]) => {
        if (!["host", "both"].includes(currentUser.role)) throw new ApiError("Host access is required for this form.", 403);
        if (currentListing && currentListing.host_id !== currentUser.id) throw new ApiError("You do not own this listing.", 403);
        setUser(currentUser);
        setListing(currentListing);
      }).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : "We could not load this listing form.")).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [listingId]);

  function submit(payload: ListingPayload) {
    setSaving(true);
    setError("");
    const request = editing && listingId ? updateListing(listingId, payload) : createListing(payload);
    request.then((saved) => { setNotice("Listing saved successfully."); window.setTimeout(() => router.push(`/host/listings/${saved.id}/edit`), 450); }).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : "We could not save this listing.")).finally(() => setSaving(false));
  }

  if (loading) return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="host-page"><div className="host-container"><div className="skeleton-detail-title" /><div className="host-form-skeleton" /></div></main></>;
  if (error && !user) return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="host-message"><ShieldAlert size={30} /><h1>Host access unavailable</h1><p>{error}</p><Link className="primary-button" href="/">Return to Explore</Link></main></>;
  return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="host-page"><div className="host-container"><Link className="back-link" href="/host"><ArrowLeft size={16} /> Back to host space</Link><div className="editor-heading"><span className="eyebrow">{editing ? "Refine your stay" : "Share your place"}</span><h1>{editing ? "Edit listing" : "Create a listing"}</h1><p>{editing ? "Keep your listing details fresh and accurate." : "Give guests a clear, honest preview of a place worth staying."}</p></div><ListingForm listing={listing ?? undefined} saving={saving} serverError={error} onSubmit={submit} /></div></main>{notice && <div className="toast" role="status">{notice}</div>}</>;
}
