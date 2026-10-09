"use client";

import { format } from "date-fns";
import { AlertCircle, CalendarDays, Check, ChevronDown, Minus, Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { AvailabilityCalendar } from "@/components/listing/AvailabilityCalendar";
import type { BlockedRange, Listing } from "@/types/listing";

type ReservationCardProps = {
  listing: Listing;
  blockedRanges: BlockedRange[];
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  onDatesChange: (checkIn: Date | null, checkOut: Date | null) => void;
  onGuestsChange: (guests: number) => void;
  availabilityReady: boolean;
  onReserve: () => void;
  reserveBusy?: boolean;
};

const CLEANING_RATE = 0.08;
const MIN_CLEANING_FEE = 25;
const SERVICE_RATE = 0.12;

export function ReservationCard({ listing, blockedRanges, checkIn, checkOut, guests, onDatesChange, onGuestsChange, availabilityReady, onReserve, reserveBusy = false }: ReservationCardProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const nights = checkIn && checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000) : 0;
  const price = Number(listing.price_per_night);
  const breakdown = useMemo(() => {
    const subtotal = price * nights;
    const cleaning = Math.max(MIN_CLEANING_FEE, subtotal * CLEANING_RATE);
    const service = subtotal * SERVICE_RATE;
    return { subtotal, cleaning, service, total: subtotal + cleaning + service };
  }, [nights, price]);
  const invalidGuests = guests < 1 || guests > listing.max_guests;
  const ready = Boolean(availabilityReady && checkIn && checkOut && nights > 0 && !invalidGuests);

  return <aside className="reservation-card">
    <div className="reservation-price"><strong>${price.toLocaleString()}</strong> <span>night</span></div>
    <div className="reservation-fields">
      <button className="reservation-field" type="button" onClick={() => { setCalendarOpen(!calendarOpen); setGuestOpen(false); }}><CalendarDays size={17} /><span><small>Dates</small>{checkIn && checkOut ? `${format(checkIn, "MMM d")} - ${format(checkOut, "MMM d")}` : "Add dates"}</span></button>
      <button className="reservation-field" type="button" onClick={() => { setGuestOpen(!guestOpen); setCalendarOpen(false); }}><Users size={17} /><span><small>Guests</small>{guests ? `${guests} guest${guests === 1 ? "" : "s"}` : "Add guests"}</span><ChevronDown size={15} /></button>
    </div>
    {calendarOpen && <div className="reservation-popover">{availabilityReady ? <AvailabilityCalendar blockedRanges={blockedRanges} checkIn={checkIn} checkOut={checkOut} onChange={(nextCheckIn, nextCheckOut) => { onDatesChange(nextCheckIn, nextCheckOut); if (nextCheckIn && nextCheckOut) setCalendarOpen(false); }} /> : <p className="calendar-message"><AlertCircle size={15} /> Availability is temporarily unavailable.</p>}</div>}
    {guestOpen && <div className="guest-popover"><div className="guest-popover__heading"><span><strong>Guests</strong><small>{listing.max_guests} guests maximum</small></span><Users size={18} /></div><div className="guest-counter"><span>Guests</span><div><button type="button" onClick={() => onGuestsChange(Math.max(1, guests - 1))} disabled={guests <= 1} aria-label="Remove guest"><Minus size={15} /></button><b>{guests}</b><button type="button" onClick={() => onGuestsChange(Math.min(listing.max_guests, guests + 1))} disabled={guests >= listing.max_guests} aria-label="Add guest"><Plus size={15} /></button></div></div></div>}
    {invalidGuests && guests > 0 && <p className="reservation-error"><AlertCircle size={14} /> Maximum {listing.max_guests} guests</p>}
    {ready ? <div className="price-breakdown"><div><span>${price.toLocaleString()} × {nights} nights</span><span>${breakdown.subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div><div><span>Cleaning fee</span><span>${breakdown.cleaning.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div><div><span>Service fee</span><span>${breakdown.service.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div><div className="price-total"><strong>Total</strong><strong>${breakdown.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div></div> : <p className="reservation-prompt"><Check size={15} /> Add dates to see the total price</p>}
    <button className="reserve-button" type="button" disabled={!ready || reserveBusy} onClick={onReserve}>{reserveBusy ? "Preparing checkout..." : ready ? "Reserve" : "Check availability"}</button>
    <p className="reservation-note">You won&apos;t be charged yet</p>
  </aside>;
}
