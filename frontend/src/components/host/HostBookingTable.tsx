import { format, parseISO } from "date-fns";
import { CalendarDays, MapPin } from "lucide-react";

import type { HostBooking, Listing } from "@/types/listing";

type Props = { rows: Array<HostBooking & { listing: Listing }> };

export function HostBookingTable({ rows }: Props) {
  return <div className="host-booking-table-wrap"><table className="host-booking-table"><thead><tr><th>Listing</th><th>Guest</th><th>Dates</th><th>Guests</th><th>Status</th><th>Total</th><th>Booking</th></tr></thead><tbody>{rows.map((booking) => <tr key={booking.id}><td><strong>{booking.listing.title}</strong><span><MapPin size={12} /> {booking.listing.city}</span></td><td><strong>{booking.guest.name}</strong><span>{booking.guest.email}</span></td><td><span className="table-dates"><CalendarDays size={13} /> {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d, yyyy")}</span></td><td>{booking.guests}</td><td><span className={`status-pill status-pill--${booking.status}`}>{booking.status}</span></td><td><strong>${Number(booking.total_price).toFixed(2)}</strong></td><td>#{booking.id}<small>{format(parseISO(booking.created_at), "MMM d, yyyy")}</small></td></tr>)}</tbody></table></div>;
}
