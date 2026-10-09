import type { LoginPayload, SignupPayload } from "@/types/auth";
import type { Availability, Booking, BookingDraft, HostBooking, Listing, ListingPage, ListingPayload, Review, ReviewPayload, SearchFilters, User, WishlistItem } from "@/types/listing";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit, redirectOnUnauthorized = false): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError("The API URL is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("We could not reach the marketplace service.");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError("The marketplace service returned an invalid response.", response.status);
    }
  }

  if (!response.ok) {
    if (response.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?next=${encodeURIComponent(next)}`);
    }
    const rawDetail = typeof payload === "object" && payload !== null && "detail" in payload ? payload.detail : null;
    const detail = typeof rawDetail === "string"
      ? rawDetail
      : Array.isArray(rawDetail)
        ? "Please check the information you entered and try again."
        : "Something went wrong while loading this page.";
    throw new ApiError(detail, response.status);
  }

  return payload as T;
}

export async function signup(payload: SignupPayload): Promise<User> {
  return request<User>("/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function login(payload: LoginPayload): Promise<User> {
  return request<User>("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function logout(): Promise<void> {
  await request<void>("/auth/logout", { method: "POST" });
}

export async function becomeHost(): Promise<User> {
  return request<User>("/users/me/become-host", { method: "POST" }, true);
}

export async function getCurrentUser(redirectOnUnauthorized = false): Promise<User> {
  return request<User>("/users/me", undefined, redirectOnUnauthorized);
}

export async function getListings(filters: SearchFilters, limit = 12): Promise<ListingPage> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("limit", String(limit));
  params.set("sort", "newest");
  if (filters.location) params.set("location", filters.location);
  if (filters.check_in && filters.check_out) {
    params.set("check_in", filters.check_in);
    params.set("check_out", filters.check_out);
  }
  if (filters.guests) params.set("guests", String(filters.guests));
  if (filters.min_price) params.set("min_price", filters.min_price);
  if (filters.max_price) params.set("max_price", filters.max_price);
  if (filters.property_type) params.set("property_type", filters.property_type);
  if (filters.amenities.length) params.set("amenities", filters.amenities.join(","));
  if (filters.minimum_rating) params.set("minimum_rating", filters.minimum_rating);
  return request<ListingPage>(`/listings?${params.toString()}`);
}

export async function getListing(listingId: number): Promise<Listing> {
  return request<Listing>(`/listings/${listingId}`);
}

export async function getAvailability(listingId: number): Promise<Availability> {
  return request<Availability>(`/listings/${listingId}/availability`);
}

export async function getReviews(listingId: number): Promise<Review[]> {
  return request<Review[]>(`/listings/${listingId}/reviews`);
}

export async function createReview(listingId: number, payload: ReviewPayload): Promise<Review> {
  return request<Review>(`/listings/${listingId}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, true);
}

export async function getWishlist(redirectOnUnauthorized = false): Promise<WishlistItem[]> {
  return request<WishlistItem[]>("/wishlist", undefined, redirectOnUnauthorized);
}

export async function addToWishlist(listingId: number): Promise<WishlistItem> {
  return request<WishlistItem>(`/wishlist/${listingId}`, { method: "POST" }, true);
}

export async function removeFromWishlist(listingId: number): Promise<void> {
  await request<void>(`/wishlist/${listingId}`, { method: "DELETE" }, true);
}

export async function createBooking(draft: BookingDraft): Promise<Booking> {
  return request<Booking>("/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listing_id: draft.listingId,
      check_in: draft.checkIn,
      check_out: draft.checkOut,
      guests: draft.guests,
    }),
  }, true);
}

export async function getMyTrips(): Promise<Booking[]> {
  return request<Booking[]>("/bookings/my-trips", undefined, true);
}

export async function getBooking(bookingId: number): Promise<Booking> {
  return request<Booking>(`/bookings/${bookingId}`, undefined, true);
}

export async function cancelBooking(bookingId: number): Promise<Booking> {
  return request<Booking>(`/bookings/${bookingId}`, { method: "DELETE" }, true);
}

export async function createListing(payload: ListingPayload): Promise<Listing> {
  return request<Listing>("/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, true);
}

export async function updateListing(listingId: number, payload: Partial<ListingPayload>): Promise<Listing> {
  return request<Listing>(`/listings/${listingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, true);
}

export async function deleteListing(listingId: number): Promise<void> {
  await request<void>(`/listings/${listingId}`, { method: "DELETE" }, true);
}

export async function getHostBookings(listingId: number): Promise<HostBooking[]> {
  return request<HostBooking[]>(`/listings/${listingId}/bookings`, undefined, true);
}
