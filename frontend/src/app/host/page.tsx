"use client";

import { isAfter, parseISO, startOfDay } from "date-fns";
import { Building2, CalendarCheck, DollarSign, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { HostListingCard } from "@/components/host/HostListingCard";
import { ApiError, becomeHost, deleteListing, getCurrentUser, getHostBookings, getListings } from "@/lib/api";
import type { Booking, Listing, SearchFilters, User } from "@/types/listing";

const emptyFilters: SearchFilters = { location: "", check_in: "", check_out: "", guests: null, min_price: "", max_price: "", property_type: "", amenities: [], minimum_rating: "", page: 1 };

export default function HostDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [today, setToday] = useState<Date | null>(null);
  const [activatingHost, setActivatingHost] = useState(false);

  function loadDashboard() {
    setLoading(true);
    setError("");
    Promise.all([getCurrentUser(true), getListings({ ...emptyFilters, page: 1 }, 50)])
      .then(async ([currentUser, listingPage]) => {
        setUser(currentUser);
        if (!['host', 'both'].includes(currentUser.role)) { setListings([]); setBookings([]); return; }
        const ownedListings = listingPage.items.filter((listing) => listing.host_id === currentUser.id);
        const bookingGroups = await Promise.all(ownedListings.map((listing) => getHostBookings(listing.id).then((rows) => rows.map((row) => ({ ...row, listing })) )));
        setUser(currentUser);
        setListings(ownedListings);
        setBookings(bookingGroups.flat());
      })
      .catch((reason: unknown) => setError(reason instanceof ApiError && reason.status === 403 ? "Your current user does not have host access." : "We could not load your host dashboard."))
      .finally(() => setLoading(false));
  }

  async function activateHost() {
    if (activatingHost) return;
    setActivatingHost(true);
    setError("");
    try { await becomeHost(); loadDashboard(); }
    catch (reason: unknown) { setError(reason instanceof ApiError ? reason.message : "We could not enable host access."); }
    finally { setActivatingHost(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadDashboard, 0);
    const todayTimer = window.setTimeout(() => setToday(startOfDay(new Date())), 0);
    return () => { window.clearTimeout(timer); window.clearTimeout(todayTimer); };
  }, []);

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteListing(deleteTarget.id);
      setListings((current) => current.filter((listing) => listing.id !== deleteTarget.id));
      setNotice("Listing deleted successfully.");
      setDeleteTarget(null);
      window.setTimeout(() => setNotice(""), 2800);
    } catch (reason: unknown) {
      setError(reason instanceof ApiError && reason.status === 409 ? "This listing has booking or review history and cannot be deleted." : reason instanceof ApiError && reason.status === 403 ? "You do not own this listing." : "We could not delete this listing.");
    } finally {
      setDeleting(false);
    }
  }

  const upcoming = today ? bookings.filter((booking) => booking.status === "confirmed" && isAfter(parseISO(booking.check_out), today)).length : 0;
  const revenue = bookings.filter((booking) => booking.status === "confirmed").reduce((sum, booking) => sum + Number(booking.total_price), 0);

  if (loading) return <><Header filters={emptyFilters} onSearch={() => undefined} /><HostSkeleton /></>;
  if (error && !user) return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="host-message"><ShieldAlert size={30} /><h1>Host dashboard unavailable</h1><p>{error}</p><button className="primary-button" type="button" onClick={loadDashboard}>Try again</button></main></>;
  if (user && !["host", "both"].includes(user.role)) return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="host-page"><div className="host-container"><div className="host-empty"><Building2 size={30} /><span className="eyebrow">Host space</span><h1>Ready to host?</h1><p>Enable host tools to create listings and manage guest bookings.</p>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary-button" type="button" onClick={activateHost} disabled={activatingHost}>{activatingHost ? "Enabling…" : "Become a host"}</button></div></div></main></>;

  return <><Header filters={emptyFilters} onSearch={() => undefined} /><main className="host-page"><div className="host-container"><div className="host-page-heading"><div><span className="eyebrow">Host space</span><h1>Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}.</h1><p>Keep your stays, guests, and hosting details in one place.</p></div><Link className="primary-button" href="/host/listings/new"><Plus size={17} /> Create listing</Link></div><div className="host-summary-grid"><SummaryCard icon={<Building2 size={20} />} label="Total listings" value={String(listings.length)} /><SummaryCard icon={<CalendarCheck size={20} />} label="Total bookings" value={String(bookings.length)} /><SummaryCard icon={<CalendarCheck size={20} />} label="Upcoming bookings" value={String(upcoming)} /><SummaryCard icon={<DollarSign size={20} />} label="Approx. revenue" value={`$${revenue.toFixed(0)}`} /></div><section className="host-section"><div className="host-section-heading"><div><span className="eyebrow">Your portfolio</span><h2>Listings</h2></div><span>{listings.length} active</span></div>{listings.length ? <div className="host-listing-grid">{listings.map((listing) => <HostListingCard key={listing.id} listing={listing} onDelete={setDeleteTarget} />)}</div> : <div className="host-empty"><Building2 size={28} /><h3>Your hosting story starts here</h3><p>Create your first listing and share a place you love.</p><Link className="primary-button" href="/host/listings/new">Create your first listing</Link></div>}</section></div></main>{deleteTarget && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Delete listing"><div className="cancel-modal"><button className="close-button" type="button" onClick={() => setDeleteTarget(null)} aria-label="Close delete dialog">×</button><TrashIcon /><h2>Are you sure you want to delete this listing?</h2><p>This action cannot be undone. Listings with booking or review history are protected.</p><div className="cancel-actions"><button className="outline-button" type="button" onClick={() => setDeleteTarget(null)}>Keep listing</button><button className="danger-button" type="button" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete listing"}</button></div></div></div>}{notice && <div className="toast" role="status">{notice}</div>}</>;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="host-summary-card"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>; }
function TrashIcon() { return <span className="delete-modal-icon">!</span>; }
function HostSkeleton() { return <main className="host-page"><div className="host-container"><div className="skeleton-detail-title" /><div className="host-summary-grid"><div className="host-skeleton-card" /><div className="host-skeleton-card" /><div className="host-skeleton-card" /></div><div className="host-skeleton-list" /></div></main>; }
