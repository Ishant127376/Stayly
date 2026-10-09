"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CategoryNav } from "@/components/filters/CategoryNav";
import { FilterPopover } from "@/components/filters/FilterPopover";
import { Header } from "@/components/layout/Header";
import { ListingCard, ListingSkeleton } from "@/components/listings/ListingCard";
import { Pagination } from "@/components/listings/Pagination";
import { ApiError, getListings, getWishlist } from "@/lib/api";
import type { ListingPage, SearchFilters } from "@/types/listing";
import { EmptyState, ErrorState, ExploreIntro } from "@/components/ui/States";

const defaultFilters: SearchFilters = {
  location: "", check_in: "", check_out: "", guests: null, min_price: "", max_price: "",
  property_type: "", amenities: [], minimum_rating: "", page: 1,
};

function readFiltersFromUrl(params: { get: (name: string) => string | null }): SearchFilters {
  const guests = params.get("guests");
  return {
    ...defaultFilters,
    location: params.get("location") ?? "",
    check_in: params.get("check_in") ?? "",
    check_out: params.get("check_out") ?? "",
    guests: guests ? Number(guests) : null,
    min_price: params.get("min_price") ?? "",
    max_price: params.get("max_price") ?? "",
    property_type: params.get("property_type") ?? "",
    amenities: params.get("amenities")?.split(",").filter(Boolean) ?? [],
    minimum_rating: params.get("minimum_rating") ?? "",
    page: Number(params.get("page") ?? 1) || 1,
  };
}

function filtersToQuery(filters: SearchFilters): string {
  const params = new URLSearchParams();
  const entries: Array<[string, string | number | null]> = [
    ["location", filters.location], ["check_in", filters.check_in], ["check_out", filters.check_out],
    ["guests", filters.guests], ["min_price", filters.min_price], ["max_price", filters.max_price],
    ["property_type", filters.property_type], ["amenities", filters.amenities.join(",")],
    ["minimum_rating", filters.minimum_rating], ["page", filters.page],
  ];
  entries.forEach(([key, value]) => { if (value !== null && value !== "") params.set(key, String(value)); });
  return params.toString();
}

function filtersForCategory(value: string, current: SearchFilters): SearchFilters {
  const selectedCategory = current.property_type
    ? `property:${current.property_type}`
    : current.amenities.includes("Beach access")
      ? "amenity:Beach access"
      : current.amenities.includes("Mountain view")
        ? "amenity:Mountain view"
        : "";
  const next = { ...current };
  if (selectedCategory.startsWith("property:")) next.property_type = "";
  if (selectedCategory.startsWith("amenity:")) {
    const categoryAmenity = selectedCategory.slice("amenity:".length);
    next.amenities = current.amenities.filter((name) => name !== categoryAmenity);
  }
  if (value.startsWith("property:")) next.property_type = value.slice("property:".length);
  if (value.startsWith("amenity:")) next.amenities = [...next.amenities, value.slice("amenity:".length)];
  return next;
}

function ExplorePage() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>(() => readFiltersFromUrl(searchParams));
  const [data, setData] = useState<ListingPage | null>(null);
  const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    function restoreFromHistory() {
      setLoading(true);
      setError(false);
      setFilters(readFiltersFromUrl(new URLSearchParams(window.location.search)));
    }
    window.addEventListener("popstate", restoreFromHistory);
    return () => window.removeEventListener("popstate", restoreFromHistory);
  }, []);

  useEffect(() => {
    let active = true;
    getListings(filters)
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => { if (active && reason instanceof ApiError) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  useEffect(() => {
    getWishlist().then((items) => setWishlistedIds(new Set(items.map((item) => item.listing_id)))).catch(() => undefined);
  }, []);

  function updateSearch(values: Pick<SearchFilters, "location" | "check_in" | "check_out" | "guests">) {
    setLoading(true);
    setError(false);
    const next = { ...filters, ...values, page: 1 };
    const query = filtersToQuery(next);
    window.history.pushState(null, "", query ? `/?${query}` : "/");
    setFilters(next);
  }

  function updateFilters(values: Pick<SearchFilters, "min_price" | "max_price" | "property_type" | "amenities" | "minimum_rating" | "guests">) {
    setLoading(true);
    setError(false);
    const next = { ...filters, ...values, page: 1 };
    const query = filtersToQuery(next);
    window.history.pushState(null, "", query ? `/?${query}` : "/");
    setFilters(next);
  }

  function selectCategory(value: string) {
    setLoading(true);
    setError(false);
    const next = { ...filtersForCategory(value, filters), page: 1 };
    const query = filtersToQuery(next);
    window.history.pushState(null, "", query ? `/?${query}` : "/");
    setFilters(next);
  }

  function resetFilters() {
    setLoading(true);
    setError(false);
    window.history.pushState(null, "", "/");
    setFilters({ ...defaultFilters });
  }
  function setPage(page: number) {
    setLoading(true);
    setError(false);
    const next = { ...filters, page };
    window.history.pushState(null, "", `/?${filtersToQuery(next)}`);
    setFilters(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const activeFilterCount = [filters.min_price, filters.max_price, filters.property_type, filters.minimum_rating, filters.guests?.toString(), ...filters.amenities].filter(Boolean).length;

  return <>
    <Header filters={filters} onSearch={updateSearch} />
    <main className="explore-page">
      <div className="page-container">
        <ExploreIntro />
        <div className="category-toolbar"><CategoryNav selected={filters.property_type ? `property:${filters.property_type}` : filters.amenities.includes("Beach access") ? "amenity:Beach access" : filters.amenities.includes("Mountain view") ? "amenity:Mountain view" : ""} onSelect={selectCategory} /><FilterPopover key={`${filters.property_type}-${filters.min_price}-${filters.max_price}-${filters.minimum_rating}-${filters.guests}-${filters.amenities.join(",")}`} filters={filters} onApply={updateFilters} activeCount={activeFilterCount} /></div>
        <div className="results-heading"><div><span className="eyebrow">Explore stays</span><h2>{data?.total ?? ""} places to stay</h2></div>{!loading && data && <span className="results-count">Updated just now</span>}</div>
        {loading ? <div className="listing-grid">{Array.from({ length: 12 }, (_, index) => <ListingSkeleton key={index} />)}</div> : error ? <ErrorState onRetry={() => { setLoading(true); setError(false); setFilters((current) => ({ ...current })); }} /> : data?.items.length === 0 ? <EmptyState onReset={resetFilters} /> : <div className="listing-grid">{data?.items.map((listing, index) => <ListingCard key={listing.id} listing={listing} priority={index === 0} wishlisted={wishlistedIds.has(listing.id)} onWishlistChange={(id, active) => setWishlistedIds((current) => { const next = new Set(current); if (active) next.add(id); else next.delete(id); return next; })} />)}</div>}
        {data && !loading && !error && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
    </main>
  </>;
}

export default function Home() {
  return <Suspense fallback={<main className="explore-page"><div className="page-container"><div className="listing-grid">{Array.from({ length: 8 }, (_, index) => <ListingSkeleton key={index} />)}</div></div></main>}><ExplorePage /></Suspense>;
}
