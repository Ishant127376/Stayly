"use client";

import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { ArrowLeft, Check, Heart, MapPin, Share2, Star, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { AvailabilityCalendar } from "@/components/listing/AvailabilityCalendar";
import { PhotoGallery } from "@/components/listing/PhotoGallery";
import { ReservationCard } from "@/components/listing/ReservationCard";
import { ApiError, addToWishlist, createReview, getAvailability, getListing, getMyTrips, getReviews, getWishlist, removeFromWishlist } from "@/lib/api";
import type { Availability, BookingDraft, Listing, Review, SearchFilters } from "@/types/listing";

const emptyFilters: SearchFilters = { location: "", check_in: "", check_out: "", guests: null, min_price: "", max_price: "", property_type: "", amenities: [], minimum_rating: "", page: 1 };

function ListingDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const listingId = Number(params.id);
  const [listing, setListing] = useState<Listing | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadError, setLoadError] = useState<"not-found" | "error" | null>(null);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [reviewsError, setReviewsError] = useState(false);
  const [wishlistActive, setWishlistActive] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(1);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [reviewEligible, setReviewEligible] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewNotice, setReviewNotice] = useState("");

  const invalidListingId = !Number.isInteger(listingId) || listingId < 1;

  function handleSearch(values: Pick<SearchFilters, "location" | "check_in" | "check_out" | "guests">) {
    const query = new URLSearchParams();
    if (values.location) query.set("location", values.location);
    if (values.check_in) query.set("check_in", values.check_in);
    if (values.check_out) query.set("check_out", values.check_out);
    if (values.guests) query.set("guests", String(values.guests));
    router.push(query.toString() ? `/?${query.toString()}` : "/");
  }

  useEffect(() => {
    if (invalidListingId) return;
    Promise.allSettled([getListing(listingId), getAvailability(listingId), getReviews(listingId), getWishlist()])
      .then(([listingResult, availabilityResult, reviewsResult, wishlistResult]) => {
        if (listingResult.status === "rejected") {
          const reason: unknown = listingResult.reason;
          setLoadError(reason instanceof ApiError && reason.status === 404 ? "not-found" : "error");
          return;
        }
        setListing(listingResult.value);
        if (availabilityResult.status === "fulfilled") setAvailability(availabilityResult.value);
        else setAvailabilityError(true);
        if (reviewsResult.status === "fulfilled") setReviews(reviewsResult.value);
        else setReviewsError(true);
        if (wishlistResult.status === "fulfilled") setWishlistActive(wishlistResult.value.some((item) => item.listing_id === listingId));
      });
  }, [invalidListingId, listingId]);

  useEffect(() => {
    if (invalidListingId) return;
    getMyTrips().then((trips) => {
      const today = startOfDay(new Date());
      setReviewEligible(trips.some((trip) => trip.listing_id === listingId && trip.status === "confirmed" && isBefore(parseISO(trip.check_out), today)));
    }).catch(() => setReviewEligible(false));
  }, [invalidListingId, listingId]);

  const loading = !invalidListingId && !listing && !loadError;

  async function toggleWishlist() {
    if (!listing || wishlistBusy) return;
    setWishlistBusy(true);
    try {
      if (wishlistActive) {
        await removeFromWishlist(listing.id);
        setWishlistActive(false);
        setNotice("Removed from your wishlist");
      } else {
        await addToWishlist(listing.id);
        setWishlistActive(true);
        setNotice("Saved to your wishlist");
      }
      window.setTimeout(() => setNotice(""), 2400);
    } catch {
      setNotice("We could not update your wishlist. Try again.");
    } finally {
      setWishlistBusy(false);
    }
  }

  if (loading) return <><Header filters={emptyFilters} onSearch={handleSearch} /><DetailSkeleton /></>;
  if (invalidListingId || !listing || loadError === "not-found") return <><Header filters={emptyFilters} onSearch={handleSearch} /><DetailMessage title="This stay is no longer available" message="We could not find that listing. Return to Explore to discover another place." /></>;
  if (loadError === "error") return <><Header filters={emptyFilters} onSearch={handleSearch} /><DetailMessage title="We could not load this stay" message="Please return to Explore and try opening the listing again." /></>;

  const rating = Number(listing.rating);
  const shortDescription = listing.description.length > 260 && !descriptionExpanded ? `${listing.description.slice(0, 260)}…` : listing.description;
  const blockedRanges = availability?.blocked_ranges ?? [];
  const currentListing = listing;

  function reserveStay() {
    if (!checkIn || !checkOut || guests < 1 || guests > currentListing.max_guests) return;
    const draft: BookingDraft = { listingId: currentListing.id, checkIn: format(checkIn, "yyyy-MM-dd"), checkOut: format(checkOut, "yyyy-MM-dd"), guests };
    sessionStorage.setItem("stayly:booking-draft", JSON.stringify(draft));
    router.push(`/checkout?listingId=${currentListing.id}`);
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listing || reviewSubmitting || !reviewComment.trim()) return;
    setReviewSubmitting(true);
    setReviewNotice("");
    try {
      await createReview(listing.id, { rating: reviewRating, comment: reviewComment.trim() });
      const [updatedListing, updatedReviews] = await Promise.all([getListing(listing.id), getReviews(listing.id)]);
      setListing(updatedListing);
      setReviews(updatedReviews);
      setReviewComment("");
      setReviewOpen(false);
      setReviewNotice("Thanks for sharing your stay.");
      window.setTimeout(() => setReviewNotice(""), 2600);
    } catch (reason: unknown) {
      setReviewNotice(reason instanceof ApiError ? reason.message : "We could not submit your review.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  return <>
    <Header filters={emptyFilters} onSearch={handleSearch} />
    <main className="detail-page">
      <div className="detail-container">
        <Link className="back-link" href="/"><ArrowLeft size={16} /> Back to stays</Link>
        <div className="detail-title-row"><div><h1>{listing.title}</h1><div className="detail-subline"><span><Star size={15} fill="currentColor" /> {rating.toFixed(1)} · {listing.review_count} reviews</span><span className="subline-dot">·</span><span><MapPin size={15} /> {listing.location}</span></div></div><div className="detail-actions"><button className={`detail-action ${wishlistActive ? "detail-action--active" : ""}`} type="button" onClick={toggleWishlist} disabled={wishlistBusy} aria-label={wishlistActive ? "Remove from wishlist" : "Add to wishlist"}><Heart size={18} fill={wishlistActive ? "currentColor" : "none"} /> {wishlistActive ? "Saved" : "Save"}</button><button className="detail-action" type="button" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Share2 size={17} /> Share</button></div></div>
        <PhotoGallery title={listing.title} images={listing.images} />
        <div className="detail-layout">
          <div className="detail-content">
            <section className="detail-section detail-overview"><div><h2>{listing.property_type[0].toUpperCase() + listing.property_type.slice(1)} hosted by {listing.host.name}</h2><p>{listing.max_guests} guests · {listing.bedrooms} bedrooms · {listing.beds} beds · {listing.bathrooms} baths</p></div><div className="host-avatar host-avatar--small">{listing.host.avatar ? <Image src={listing.host.avatar} alt={listing.host.name} width={54} height={54} /> : <UserRound size={21} />}</div></section>
            <section className="detail-section"><h2>About this place</h2><p className="description-text">{shortDescription}</p>{listing.description.length > 260 && <button className="inline-link" type="button" onClick={() => setDescriptionExpanded(!descriptionExpanded)}>{descriptionExpanded ? "Show less" : "Show more"}</button>}</section>
            <section className="detail-section"><div className="section-heading"><h2>What this place offers</h2>{listing.amenities.length > 6 && <button className="outline-button" type="button" onClick={() => setShowAllAmenities(true)}>Show all amenities</button>}</div><div className="amenities-grid">{listing.amenities.slice(0, 6).map((amenity) => <div className="amenity-item" key={amenity.id}><Check size={17} /><span>{amenity.name}</span></div>)}</div></section>
            <section className="detail-section availability-mobile">{availabilityError ? <p className="muted-text">Availability is temporarily unavailable. Please try again later.</p> : <AvailabilityCalendar blockedRanges={blockedRanges} checkIn={checkIn} checkOut={checkOut} onChange={(nextCheckIn, nextCheckOut) => { setCheckIn(nextCheckIn); setCheckOut(nextCheckOut); }} />}</section>
            <section className="detail-section reviews-section"><div className="reviews-heading"><div><span className="eyebrow">Guestbook</span><h2><Star size={19} fill="currentColor" /> {rating.toFixed(1)} · {listing.review_count} reviews</h2></div>{reviewEligible && <button className="outline-button" type="button" onClick={() => setReviewOpen(true)}>Write a review</button>}</div>{reviewsError ? <p className="muted-text">Reviews are temporarily unavailable.</p> : reviews.length ? <div className="reviews-grid">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <div className="review-empty"><Star size={22} /><p>No reviews yet. Be the first guest to share a stay story.</p></div>}</section>
            <section className="detail-section location-section"><span className="eyebrow">Where you&apos;ll be</span><h2>{listing.city}, {listing.country}</h2><div className="map-placeholder"><MapPin size={28} /><span>{listing.location}</span><small>Approximate location shown for privacy</small></div></section>
          </div>
          <div className="detail-reservation"><ReservationCard listing={listing} blockedRanges={blockedRanges} availabilityReady={!availabilityError} checkIn={checkIn} checkOut={checkOut} guests={guests} onDatesChange={(nextCheckIn, nextCheckOut) => { setCheckIn(nextCheckIn); setCheckOut(nextCheckOut); }} onGuestsChange={setGuests} onReserve={reserveStay} />{availabilityError && <p className="muted-text">Availability is temporarily unavailable.</p>}</div>
        </div>
      </div>
    </main>
    {showAllAmenities && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="All amenities" onClick={() => setShowAllAmenities(false)}><div className="amenities-modal" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><h2>What this place offers</h2><button className="close-button" type="button" onClick={() => setShowAllAmenities(false)} aria-label="Close amenities"><ArrowLeft size={18} /></button></div><div className="amenities-modal-grid">{listing.amenities.map((amenity) => <div className="amenity-item" key={amenity.id}><Check size={17} /><span>{amenity.name}</span></div>)}</div></div></div>}
    {reviewOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Write a review" onClick={() => setReviewOpen(false)}><form className="review-modal" onSubmit={submitReview} onClick={(event) => event.stopPropagation()}><div className="modal-heading"><h2>Share your stay</h2><button className="close-button" type="button" onClick={() => setReviewOpen(false)} aria-label="Close review form"><ArrowLeft size={18} /></button></div><p className="muted-text">Your review helps future guests know what to expect.</p><div className="review-rating-picker" aria-label="Rating"><span>Rating</span><div>{[1, 2, 3, 4, 5].map((value) => <button className={value <= reviewRating ? "review-star review-star--active" : "review-star"} key={value} type="button" onClick={() => setReviewRating(value)} aria-label={`${value} stars`}>★</button>)}</div></div><label className="review-comment-field">Comment<textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} minLength={3} rows={5} placeholder="What did you enjoy about the stay?" /></label>{reviewNotice && <p className="host-form-error">{reviewNotice}</p>}<button className="confirm-button" type="submit" disabled={reviewSubmitting || reviewComment.trim().length < 3}>{reviewSubmitting ? "Submitting..." : "Submit review"}</button></form></div>}
    {reviewNotice && !reviewOpen && <div className="toast" role="status">{reviewNotice}</div>}
    {notice && <div className="toast" role="status">{notice}</div>}
  </>;
}

function ReviewCard({ review }: { review: Review }) {
  return <article className="review-card"><div className="review-author">{review.user.avatar ? <Image src={review.user.avatar} alt={review.user.name} width={39} height={39} /> : <span className="review-avatar-fallback"><UserRound size={17} /></span>}<div><strong>{review.user.name}</strong><small>{format(parseISO(review.created_at), "MMMM yyyy")}</small></div></div><div className="review-stars">{"★".repeat(review.rating)}<span>{review.rating}/5</span></div><p>{review.comment}</p></article>;
}

function DetailMessage({ title, message }: { title: string; message: string }) {
  return <main className="detail-message"><div className="state-icon"><MapPin size={26} /></div><h1>{title}</h1><p>{message}</p><Link className="primary-button" href="/">Back to Explore</Link></main>;
}

function DetailSkeleton() {
  return <main className="detail-page"><div className="detail-container detail-skeleton"><div className="skeleton-line skeleton-line--medium" /><div className="skeleton-detail-title" /><div className="skeleton-gallery" /><div className="skeleton-detail-block" /></div></main>;
}

export default function ListingDetailPage() {
  return <Suspense fallback={<><Header filters={emptyFilters} onSearch={() => undefined} /><DetailSkeleton /></>}><ListingDetailContent /></Suspense>;
}
