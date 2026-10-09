"use client";

import { CalendarDays, MapPin, Search, Users, X } from "lucide-react";
import { useState } from "react";

import type { SearchFilters } from "@/types/listing";

type SearchBarProps = {
  filters: SearchFilters;
  onSearch: (values: Pick<SearchFilters, "location" | "check_in" | "check_out" | "guests">) => void;
  compact?: boolean;
};

type SearchField = "where" | "when" | "guests" | null;

export function SearchBar({ filters, onSearch, compact = false }: SearchBarProps) {
  const [activeField, setActiveField] = useState<SearchField>(null);
  const [location, setLocation] = useState(filters.location);
  const [checkIn, setCheckIn] = useState(filters.check_in);
  const [checkOut, setCheckOut] = useState(filters.check_out);
  const [guests, setGuests] = useState(filters.guests ?? 0);

  function submitSearch() {
    if ((checkIn && !checkOut) || (!checkIn && checkOut)) return;
    onSearch({ location, check_in: checkIn, check_out: checkOut, guests: guests || null });
    setActiveField(null);
  }

  function clearDates() {
    setCheckIn("");
    setCheckOut("");
  }

  const dateLabel = checkIn && checkOut
    ? `${checkIn} - ${checkOut}`
    : checkIn
      ? `${checkIn} - Add dates`
      : "Add dates";

  return (
    <div className={`search-bar ${compact ? "search-bar--compact" : ""}`}>
      <div className="search-segment search-segment--where">
        <button className="search-segment__button" type="button" onClick={() => setActiveField(activeField === "where" ? null : "where")}>
          <MapPin size={17} strokeWidth={2.2} />
          <span><strong>Where</strong><small>{location || "Search destinations"}</small></span>
        </button>
        {activeField === "where" && (
          <div className="search-popover search-popover--location">
            <p className="popover-kicker">Where do you want to go?</p>
            <label className="input-with-icon">
              <MapPin size={17} />
              <input autoFocus value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Goa, Paris, Bali..." />
            </label>
            <div className="suggestion-row" onClick={() => setLocation("Goa")} role="button" tabIndex={0}>
              <span className="suggestion-icon"><MapPin size={16} /></span>
              <span><strong>Goa</strong><small>India · beach escapes</small></span>
            </div>
            <div className="suggestion-row" onClick={() => setLocation("Paris")} role="button" tabIndex={0}>
              <span className="suggestion-icon"><MapPin size={16} /></span>
              <span><strong>Paris</strong><small>France · city stays</small></span>
            </div>
          </div>
        )}
      </div>

      <div className="search-segment">
        <button className="search-segment__button" type="button" onClick={() => setActiveField(activeField === "when" ? null : "when")}>
          <CalendarDays size={17} strokeWidth={2.2} />
          <span><strong>When</strong><small>{dateLabel}</small></span>
        </button>
        {activeField === "when" && (
          <div className="search-popover search-popover--dates">
            <p className="popover-kicker">Choose your dates</p>
            <div className="date-fields">
              <label>Check in<input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} /></label>
              <label>Check out<input type="date" value={checkOut} min={checkIn || undefined} onChange={(event) => setCheckOut(event.target.value)} /></label>
            </div>
            <button className="text-button" type="button" onClick={clearDates}><X size={14} /> Clear dates</button>
          </div>
        )}
      </div>

      <div className="search-segment search-segment--guests">
        <button className="search-segment__button" type="button" onClick={() => setActiveField(activeField === "guests" ? null : "guests")}>
          <Users size={17} strokeWidth={2.2} />
          <span><strong>Guests</strong><small>{guests ? `${guests} guest${guests === 1 ? "" : "s"}` : "Add guests"}</small></span>
        </button>
        {activeField === "guests" && (
          <div className="search-popover search-popover--guests">
            <div className="guest-stepper"><span><strong>Guests</strong><small>How many people?</small></span><div><button aria-label="Remove guest" type="button" onClick={() => setGuests(Math.max(0, guests - 1))}>−</button><b>{guests}</b><button aria-label="Add guest" type="button" onClick={() => setGuests(Math.min(16, guests + 1))}>+</button></div></div>
          </div>
        )}
      </div>

      <button className="search-submit" type="button" onClick={submitSearch} aria-label="Search stays"><Search size={18} /><span>Search</span></button>
    </div>
  );
}
