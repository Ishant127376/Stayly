"use client";

import { Check, SlidersHorizontal, Star, X } from "lucide-react";
import { useState } from "react";

import type { SearchFilters } from "@/types/listing";

const propertyTypes = ["apartment", "villa", "house", "cabin", "cottage", "resort", "beachfront property"];
const amenities = ["WiFi", "Kitchen", "Pool", "Parking", "Air conditioning", "Washer", "Workspace", "Beach access", "Mountain view", "Breakfast"];

type FilterPopoverProps = {
  filters: SearchFilters;
  onApply: (values: Pick<SearchFilters, "min_price" | "max_price" | "property_type" | "amenities" | "minimum_rating" | "guests">) => void;
  activeCount: number;
};

export function FilterPopover({ filters, onApply, activeCount }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(filters.min_price);
  const [maxPrice, setMaxPrice] = useState(filters.max_price);
  const [propertyType, setPropertyType] = useState(filters.property_type);
  const [selectedAmenities, setSelectedAmenities] = useState(filters.amenities);
  const [rating, setRating] = useState(filters.minimum_rating);
  const [guests, setGuests] = useState(filters.guests?.toString() ?? "");

  function reset() {
    setMinPrice(""); setMaxPrice(""); setPropertyType(""); setSelectedAmenities([]); setRating(""); setGuests("");
  }

  function apply() {
    onApply({ min_price: minPrice, max_price: maxPrice, property_type: propertyType, amenities: selectedAmenities, minimum_rating: rating, guests: guests ? Number(guests) : null });
    setOpen(false);
  }

  function toggleAmenity(name: string) {
    setSelectedAmenities((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  return (
    <div className="filter-wrap">
      <button className={`filter-button ${activeCount ? "filter-button--active" : ""}`} type="button" onClick={() => setOpen(!open)} aria-expanded={open}><SlidersHorizontal size={16} /> Filters{activeCount > 0 && <span className="filter-count">{activeCount}</span>}</button>
      {open && <div className="filter-popover">
        <div className="filter-heading"><div><span className="eyebrow">Refine your stay</span><h2>Filters</h2></div><button className="close-button" type="button" onClick={() => setOpen(false)} aria-label="Close filters"><X size={18} /></button></div>
        <section className="filter-section"><h3>Price per night</h3><div className="price-inputs"><label>Minimum<input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="Any" /></label><label>Maximum<input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Any" /></label></div></section>
        <section className="filter-section"><h3>Property type</h3><div className="choice-grid">{propertyTypes.map((type) => <button className={`choice-chip ${propertyType === type ? "choice-chip--selected" : ""}`} key={type} type="button" onClick={() => setPropertyType(propertyType === type ? "" : type)}>{type}{propertyType === type && <Check size={14} />}</button>)}</div></section>
        <section className="filter-section"><h3>Amenities</h3><div className="choice-grid">{amenities.map((amenity) => <button className={`choice-chip ${selectedAmenities.includes(amenity) ? "choice-chip--selected" : ""}`} key={amenity} type="button" onClick={() => toggleAmenity(amenity)}>{amenity}{selectedAmenities.includes(amenity) && <Check size={14} />}</button>)}</div></section>
        <section className="filter-section filter-section--last"><div className="filter-row"><div><h3>Guest capacity</h3><small>At least this many guests</small></div><input className="small-number" type="number" min="1" max="16" value={guests} onChange={(event) => setGuests(event.target.value)} placeholder="Any" /></div><div className="filter-row"><div><h3>Rating</h3><small>Guest rating and above</small></div><label className="rating-select"><Star size={15} fill="currentColor" /><select value={rating} onChange={(event) => setRating(event.target.value)}><option value="">Any</option><option value="4">4+</option><option value="4.5">4.5+</option><option value="4.8">4.8+</option></select></label></div></section>
        <div className="filter-footer"><button className="clear-button" type="button" onClick={reset}>Clear all</button><button className="apply-button" type="button" onClick={apply}>Show stays</button></div>
      </div>}
    </div>
  );
}
