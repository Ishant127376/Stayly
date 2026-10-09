"use client";

import { isBefore, parseISO, startOfDay } from "date-fns";
import { CalendarCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { HostBookingTable } from "@/components/host/HostBookingTable";
import { ApiError, getCurrentUser, getHostBookings, getListings } from "@/lib/api";
import type { HostBooking, Listing, SearchFilters, User } from "@/types/listing";

const emptyFilters: SearchFilters = { location: "", check_in: "", check_out: "", guests: null, min_price: "", max_price: "", property_type: "", amenities: [], minimum_rating: "", page: 1 };

type Filter = "all" | "upcoming" | "past" | "cancelled";

type Row = HostBooking & { listing: Listing };

export default function HostBookingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [today, setToday] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      Promise.all([getCurrentUser(true), getListings({ ...emptyFilters, page: 1 }, 50)]).then(async ([currentUser, page]) => {
        if (!["host", "both"].includes(currentUser.role)) throw new ApiError("Host access is required for this page.", 403);
        const owned = page.items.filter((listing) => listing.host_id === currentUser.id);
        const groups = await Promise.all(owned.map((listing) => getHostBookings(listing.id).then((bookings) => bookings.map((booking) => ({ ...booking, listing })))));
        setUser(currentUser);
        setRows(groups.flat());
      }).catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : "We could not load host bookings.")).finally(() => setLoading(false));
    }, 0);
    const todayTimer = window.setTimeout(() => setToday(startOfDay(new Date())), 0);
    return () => { window.clearTimeout(timer); window.clearTimeout(todayTimer); };
  }, []);

  const visibleRows = rows.filter((booking) => {
    if (filter === "cancelled") return booking.status === "cancelled";
    if (filter === "upcoming") return booking.status === "confirmed" && today !== null && !isBefore(parseISO(booking.check_out), today);
    if (filter === "past") return booking.status === "confirmed" && today !== null && isBefore(parseISO(booking.check_out), today);
    return true;
  });

  if (loading) return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="host-page"><div className="host-container"><div className="skeleton-detail-title" /><div className="host-skeleton-list" /></div></main></>;
  if (error && !user) return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="host-message"><ShieldAlert size={30} /><h1>Host bookings unavailable</h1><p>{error}</p><Link className="primary-button" href="/host">Back to host space</Link></main></>;

  return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="host-page"><div className="host-container"><Link className="back-link" href="/host">← Back to host space</Link><div className="host-page-heading"><div><span className="eyebrow">Guest activity</span><h1>Bookings</h1><p>See who is arriving across your listings.</p></div><CalendarCheck size={30} /></div><div className="booking-filter-tabs">{(["all", "upcoming", "past", "cancelled"] as Filter[]).map((value) => <button className={filter === value ? "booking-filter-tab booking-filter-tab--active" : "booking-filter-tab"} key={value} type="button" onClick={() => setFilter(value)}>{value}</button>)}</div>{visibleRows.length ? <HostBookingTable rows={visibleRows} /> : <div className="host-empty"><CalendarCheck size={28} /><h3>No bookings in this view</h3><p>Bookings for your owned listings will appear here.</p></div>}</div></main></>;
}
