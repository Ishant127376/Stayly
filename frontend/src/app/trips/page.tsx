"use client";

import Image from "next/image";
import { isBefore, parseISO, startOfDay } from "date-fns";
import { CalendarDays, CheckCircle2, CircleX, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { ApiError, cancelBooking, getMyTrips } from "@/lib/api";
import type { Booking, SearchFilters } from "@/types/listing";

const emptyFilters: SearchFilters = { location: "", check_in: "", check_out: "", guests: null, min_price: "", max_price: "", property_type: "", amenities: [], minimum_rating: "", page: 1 };

export default function TripsPage() {
  const [trips, setTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState("");
  const [today, setToday] = useState<Date | null>(null);

  function loadTrips() {
    setLoading(true);
    setError("");
    getMyTrips().then(setTrips).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : "We could not load your trips.")).finally(() => setLoading(false));
  }
  useEffect(() => {
    const timer = window.setTimeout(loadTrips, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setToday(startOfDay(new Date())), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function confirmCancellation() {
    if (!cancelTarget || cancelling) return;
    setCancelling(true);
    try {
      const cancelled = await cancelBooking(cancelTarget.id);
      setTrips((current) => current.map((trip) => trip.id === cancelled.id ? cancelled : trip));
      setNotice("Reservation cancelled. Those dates are available again.");
      setCancelTarget(null);
      window.setTimeout(() => setNotice(""), 3000);
    } catch (reason: unknown) {
      setError(reason instanceof ApiError ? reason.message : "We could not cancel this reservation.");
    } finally {
      setCancelling(false);
    }
  }

  const upcoming = today ? trips.filter((trip) => !isBefore(parseISO(trip.check_out), today)) : trips;
  const past = today ? trips.filter((trip) => isBefore(parseISO(trip.check_out), today)) : [];

  return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="trips-page"><div className="trips-container"><div className="trips-heading"><div><span className="eyebrow">Your stays</span><h1>Trips</h1><p>Keep the details of your next escapes close at hand.</p></div><Link className="outline-button" href="/">Explore stays</Link></div>{loading ? <TripsSkeleton /> : error ? <div className="empty-state"><span className="state-icon state-icon--error"><CircleX size={25} /></span><h2>Trips are temporarily unavailable</h2><p>{error}</p><button className="primary-button" type="button" onClick={loadTrips}>Try again</button></div> : trips.length === 0 ? <div className="empty-state"><span className="state-icon"><CalendarDays size={25} /></span><h2>No trips yet</h2><p>Start exploring stays for your next getaway.</p><Link className="primary-button" href="/">Start exploring</Link></div> : <div className="trip-sections"><TripSection title="Upcoming trips" trips={upcoming} today={today} onCancel={setCancelTarget} /><TripSection title="Past trips" trips={past} today={today} onCancel={setCancelTarget} /></div>}</div></main>{cancelTarget && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Cancel reservation"><div className="cancel-modal"><button className="close-button" type="button" onClick={() => setCancelTarget(null)} aria-label="Close cancellation dialog"><X size={18} /></button><CircleX size={30} /><h2>Cancel this reservation?</h2><p>Your dates will become available again, but this action cannot be undone.</p><div className="cancel-actions"><button className="outline-button" type="button" onClick={() => setCancelTarget(null)}>Keep reservation</button><button className="danger-button" type="button" onClick={confirmCancellation} disabled={cancelling}>{cancelling ? "Cancelling..." : "Cancel reservation"}</button></div></div></div>}{notice && <div className="toast" role="status">{notice}</div>}</>;
}

function TripSection({ title, trips, today, onCancel }: { title: string; trips: Booking[]; today: Date | null; onCancel: (booking: Booking) => void }) {
  if (!trips.length) return null;
  return <section className="trip-section"><div className="trip-section-heading"><h2>{title}</h2><span>{trips.length} stay{trips.length === 1 ? "" : "s"}</span></div><div className="trip-grid">{trips.map((trip) => <TripCard key={trip.id} booking={trip} today={today} onCancel={onCancel} />)}</div></section>;
}

function TripCard({ booking, today, onCancel }: { booking: Booking; today: Date | null; onCancel: (booking: Booking) => void }) {
  const canCancel = Boolean(today && booking.status === "confirmed" && !isBefore(parseISO(booking.check_in), today));
  return <article className="trip-card"><Link href={`/listing/${booking.listing.id}`} className="trip-card-image">{booking.listing.images[0] && <Image src={booking.listing.images[0].url} alt={booking.listing.title} fill sizes="(max-width: 700px) 94vw, 360px" />}</Link><div className="trip-card-body"><div className="trip-card-title"><div><span className={`status-pill status-pill--${booking.status}`}>{booking.status}</span><h3>{booking.listing.title}</h3><p><MapPin size={14} /> {booking.listing.city}, {booking.listing.country}</p></div>{booking.status === "confirmed" ? <CheckCircle2 className="trip-confirmed" size={22} /> : <CircleX className="trip-cancelled" size={22} />}</div><div className="trip-dates"><div><small>Check-in</small><strong>{booking.check_in}</strong></div><div><small>Check-out</small><strong>{booking.check_out}</strong></div><div><small>Guests</small><strong>{booking.guests}</strong></div></div><div className="trip-card-footer"><span>Total <strong>${Number(booking.total_price).toFixed(2)}</strong></span><span>#{booking.id}</span></div>{canCancel && <button className="cancel-link" type="button" onClick={() => onCancel(booking)}>Cancel reservation</button>}</div></article>;
}

function TripsSkeleton() { return <div className="trip-grid"><div className="trip-skeleton" /><div className="trip-skeleton" /></div>; }