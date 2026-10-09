"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { AlertCircle, ArrowLeft, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { ApiError, createBooking, getAvailability, getListing } from "@/lib/api";
import type { BookingDraft, Listing, SearchFilters } from "@/types/listing";

const emptyFilters: SearchFilters = {
  location: "", check_in: "", check_out: "", guests: null, min_price: "", max_price: "",
  property_type: "", amenities: [], minimum_rating: "", page: 1,
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = Number(searchParams.get("listingId"));
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = sessionStorage.getItem("stayly:booking-draft");
        const parsed: unknown = stored ? JSON.parse(stored) : null;
        if (isBookingDraft(parsed) && parsed.listingId === listingId) setDraft(parsed);
        else {
          setError("Your reservation details are missing. Return to the listing and choose dates again.");
          setLoading(false);
        }
      } catch {
        setError("We could not recover your reservation details. Return to the listing and try again.");
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [listingId]);

  useEffect(() => {
    if (!draft) return;
    getListing(draft.listingId)
      .then(setListing)
      .catch((reason: unknown) => setError(reason instanceof ApiError && reason.status === 404 ? "This listing is no longer available." : "We could not load this listing."))
      .finally(() => setLoading(false));
  }, [draft]);

  const validDraft = Boolean(draft && listing && draft.checkOut > draft.checkIn && draft.guests > 0 && draft.guests <= listing.max_guests);
  const nights = draft ? differenceInCalendarDays(parseISO(draft.checkOut), parseISO(draft.checkIn)) : 0;
  const price = listing ? Number(listing.price_per_night) : 0;
  const subtotal = price * nights;
  const cleaningFee = Math.max(25, subtotal * 0.08);
  const serviceFee = subtotal * 0.12;
  const previewTotal = subtotal + cleaningFee + serviceFee;

  async function confirmBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !listing || !validDraft || submitting) return;
    if (!cardholder.trim() || cardNumber.replace(/\s/g, "").length < 12 || expiry.length < 4 || cvv.length < 3) {
      setError("Enter the mock payment details to continue.");
      return;
    }
    setError("");
    setConflict(false);
    setSubmitting(true);
    try {
      const booking = await createBooking(draft);
      sessionStorage.removeItem("stayly:booking-draft");
      router.push(`/booking/${booking.id}/confirmation`);
    } catch (reason: unknown) {
      if (reason instanceof ApiError && reason.status === 409) {
        await getAvailability(draft.listingId).catch(() => undefined);
        setConflict(true);
        setError("Those dates are no longer available. Choose another range on the listing.");
      } else if (reason instanceof ApiError && reason.status === 400) {
        setError(reason.message);
      } else {
        setError("We could not confirm this reservation. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <><Header filters={emptyFilters} onSearch={() => undefined} /><CheckoutSkeleton /></>;
  if (error && (!draft || !listing)) return <><Header filters={emptyFilters} onSearch={() => undefined} /><CheckoutMessage title="Checkout is unavailable" message={error} /></>;
  if (!draft || !listing) return null;

  return <>
    <Header filters={emptyFilters} onSearch={() => undefined} />
    <main className="checkout-page">
      <div className="checkout-container">
        <Link className="back-link" href={`/listing/${listing.id}`}><ArrowLeft size={16} /> Back to listing</Link>
        <div className="checkout-heading"><span className="eyebrow">Almost there</span><h1>Confirm and reserve</h1><p>Payment is mocked for this assignment. No real card will be charged.</p></div>
        {conflict && <div className="checkout-alert"><AlertCircle size={18} /><div><strong>Those dates are no longer available.</strong><span>Another guest just reserved this stay. Return to the listing to choose new dates.</span><Link href={`/listing/${listing.id}`}>Choose new dates</Link></div></div>}
        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={confirmBooking}>
            <section className="checkout-panel"><div className="panel-title"><span className="step-number">1</span><div><h2>Your trip</h2><p>Review the details before you reserve.</p></div></div><div className="trip-summary"><div><small>Dates</small><strong>{format(parseISO(draft.checkIn), "EEE, MMM d")} - {format(parseISO(draft.checkOut), "EEE, MMM d, yyyy")}</strong></div><div><small>Guests</small><strong>{draft.guests} guest{draft.guests === 1 ? "" : "s"}</strong></div></div><Link className="edit-link" href={`/listing/${listing.id}`}>Edit dates or guests</Link></section>
            <section className="checkout-panel"><div className="panel-title"><span className="step-number">2</span><div><h2>Payment details</h2><p>Use any fictional details. They are never sent or saved.</p></div><LockKeyhole size={18} /></div><div className="payment-fields"><label>Cardholder name<input value={cardholder} onChange={(event) => setCardholder(event.target.value)} placeholder="Alex Morgan" autoComplete="off" /></label><label>Card number<input value={cardNumber} onChange={(event) => setCardNumber(event.target.value.replace(/[^0-9 ]/g, "").slice(0, 19))} placeholder="4242 4242 4242 4242" inputMode="numeric" autoComplete="off" /></label><div className="payment-row"><label>Expiry<input value={expiry} onChange={(event) => setExpiry(event.target.value.replace(/[^0-9/]/g, "").slice(0, 5))} placeholder="MM/YY" autoComplete="off" /></label><label>CVV<input value={cvv} onChange={(event) => setCvv(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" inputMode="numeric" autoComplete="off" /></label></div></div><div className="mock-payment-note"><ShieldCheck size={16} /> Mock payment only · never enter real financial information</div></section>
            {error && <p className="checkout-error"><AlertCircle size={15} /> {error}</p>}
            <button className="confirm-button" type="submit" disabled={!validDraft || submitting || conflict}><CreditCard size={17} />{submitting ? "Confirming reservation..." : "Confirm and reserve"}</button>
          </form>
          <aside className="checkout-summary"><div className="checkout-listing"><div className="checkout-listing-image">{listing.images[0] && <Image src={listing.images[0].url} alt={listing.title} fill sizes="92px" />}</div><div><strong>{listing.title}</strong><span>{listing.city}, {listing.country}</span><span>★ {Number(listing.rating).toFixed(1)}</span></div></div><div className="summary-divider" /><h2>Price details</h2><div className="summary-line"><span>${price.toLocaleString()} × {nights} nights</span><span>${subtotal.toFixed(2)}</span></div><div className="summary-line"><span>Cleaning fee</span><span>${cleaningFee.toFixed(2)}</span></div><div className="summary-line"><span>Service fee</span><span>${serviceFee.toFixed(2)}</span></div><div className="summary-total"><strong>Total</strong><strong>${previewTotal.toFixed(2)}</strong></div><p className="summary-note">Your final total is calculated and confirmed by the backend.</p></aside>
        </div>
      </div>
    </main>
  </>;
}

function isBookingDraft(value: unknown): value is BookingDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.listingId === "number" && typeof candidate.checkIn === "string" && typeof candidate.checkOut === "string" && typeof candidate.guests === "number";
}

function CheckoutSkeleton() { return <main className="checkout-page"><div className="checkout-container"><div className="skeleton-line skeleton-line--short" /><div className="skeleton-detail-title" /><div className="checkout-skeleton-grid"><div className="skeleton-detail-block" /><div className="skeleton-detail-block" /></div></div></main>; }
function CheckoutMessage({ title, message }: { title: string; message: string }) { return <main className="detail-message"><div className="state-icon"><CreditCard size={26} /></div><h1>{title}</h1><p>{message}</p><Link className="primary-button" href="/">Back to Explore</Link></main>; }

export default function CheckoutPage() { return <Suspense fallback={<><Header filters={emptyFilters} onSearch={() => undefined} /><CheckoutSkeleton /></>}><CheckoutContent /></Suspense>; }
