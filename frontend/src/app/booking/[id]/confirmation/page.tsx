"use client";

import Image from "next/image";
import { format, parseISO } from "date-fns";
import { CheckCircle2, Clipboard, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { ApiError, getBooking } from "@/lib/api";
import type { Booking, SearchFilters } from "@/types/listing";

const emptyFilters: SearchFilters = { location: "", check_in: "", check_out: "", guests: null, min_price: "", max_price: "", property_type: "", amenities: [], minimum_rating: "", page: 1 };

function ConfirmationContent() {
  const params = useParams<{ id: string }>();
  const bookingId = Number(params.id);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const invalidBookingId = !Number.isInteger(bookingId) || bookingId < 1;

  useEffect(() => {
    if (invalidBookingId) return;
    getBooking(bookingId)
      .then(setBooking)
      .catch((reason: unknown) => setError(reason instanceof ApiError && reason.status === 404 ? "We could not find that reservation." : "We could not load your confirmation."));
  }, [bookingId, invalidBookingId]);

  if (invalidBookingId || error) return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="detail-message"><div className="state-icon state-icon--error"><Clipboard size={26} /></div><h1>Confirmation unavailable</h1><p>{error || "We could not find that reservation."}</p><Link className="primary-button" href="/trips">View my trips</Link></main></>;
  if (!booking) return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="confirmation-page"><div className="confirmation-skeleton" /></main></>;

  const nights = Math.max(0, Math.round((parseISO(booking.check_out).getTime() - parseISO(booking.check_in).getTime()) / 86400000));
  return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="confirmation-page"><div className="confirmation-card"><div className="confirmation-success"><CheckCircle2 size={38} /><span>Reservation confirmed</span><small>Your stay is booked and ready for its next chapter.</small></div><div className="confirmation-listing"><div className="confirmation-image">{booking.listing.images[0] && <Image src={booking.listing.images[0].url} alt={booking.listing.title} fill sizes="180px" />}</div><div><h1>{booking.listing.title}</h1><p><MapPin size={15} /> {booking.listing.city}, {booking.listing.country}</p><span className="status-pill">{booking.status}</span></div></div><div className="confirmation-section"><span className="eyebrow">Your trip</span><div className="confirmation-details"><div><small>Check-in</small><strong>{format(parseISO(booking.check_in), "EEE, MMM d, yyyy")}</strong></div><div><small>Check-out</small><strong>{format(parseISO(booking.check_out), "EEE, MMM d, yyyy")}</strong></div><div><small>Guests</small><strong><Users size={15} /> {booking.guests}</strong></div><div><small>Nights</small><strong>{nights}</strong></div></div></div><div className="confirmation-section"><span className="eyebrow">Payment summary</span><div className="confirmation-price"><div><span>${Number(booking.nightly_price).toLocaleString()} × {nights} nights</span><span>${(Number(booking.nightly_price) * nights).toFixed(2)}</span></div><div><span>Cleaning fee</span><span>${Number(booking.cleaning_fee).toFixed(2)}</span></div><div><span>Service fee</span><span>${Number(booking.service_fee).toFixed(2)}</span></div><div className="confirmation-total"><strong>Total</strong><strong>${Number(booking.total_price).toFixed(2)}</strong></div></div></div><div className="booking-id">Booking ID <strong>#{booking.id}</strong></div><div className="confirmation-actions"><Link className="primary-button" href="/trips">View my trips</Link><Link className="outline-button" href="/">Continue exploring</Link></div></div></main></>;
}

export default function ConfirmationPage() { return <Suspense fallback={<><Header filters={emptyFilters} onSearch={() => undefined} /><main className="confirmation-page"><div className="confirmation-skeleton" /></main></>}><ConfirmationContent /></Suspense>; }