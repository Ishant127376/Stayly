export type User = {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: "guest" | "host" | "both";
  created_at: string;
};

export type ListingImage = {
  id: number;
  url: string;
  display_order: number;
};

export type Amenity = {
  id: number;
  name: string;
};

export type Listing = {
  id: number;
  host_id: number;
  title: string;
  description: string;
  location: string;
  city: string;
  country: string;
  latitude: string | number | null;
  longitude: string | number | null;
  property_type: string;
  price_per_night: string | number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: string | number;
  rating: string | number;
  review_count: number;
  created_at: string;
  updated_at: string;
  host: User;
  images: ListingImage[];
  amenities: Amenity[];
};

export type ListingPayload = {
  title: string;
  description: string;
  location: string;
  city: string;
  country: string;
  latitude?: string;
  longitude?: string;
  property_type: string;
  price_per_night: string;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: string;
  images: string[];
  amenities: string[];
};

export type ListingPage = {
  items: Listing[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type Destination = { city: string; country: string };

export type SearchFilters = {
  location: string;
  check_in: string;
  check_out: string;
  guests: number | null;
  min_price: string;
  max_price: string;
  property_type: string;
  amenities: string[];
  minimum_rating: string;
  page: number;
};

export type WishlistItem = {
  user_id: number;
  listing_id: number;
  created_at: string;
  listing: {
    id: number;
    title: string;
    city: string;
    country: string;
    price_per_night: number;
    rating: number;
    images: string[];
  };
};

export type BlockedRange = {
  check_in: string;
  check_out: string;
};

export type Availability = {
  listing_id: number;
  blocked_ranges: BlockedRange[];
};

export type Review = {
  id: number;
  listing_id: number;
  user_id: number;
  rating: number;
  comment: string;
  created_at: string;
  user: Pick<User, "id" | "name" | "avatar">;
};

export type ReviewPayload = { rating: number; comment: string };

export type BookingDraft = {
  listingId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export type Booking = {
  id: number;
  listing_id: number;
  guest_id: number;
  check_in: string;
  check_out: string;
  guests: number;
  nightly_price: string | number;
  cleaning_fee: string | number;
  service_fee: string | number;
  total_price: string | number;
  status: "confirmed" | "cancelled";
  created_at: string;
  listing: {
    id: number;
    title: string;
    city: string;
    country: string;
    images: ListingImage[];
  };
};

export type HostBooking = Omit<Booking, "listing"> & {
  guest: Pick<User, "id" | "name" | "email" | "avatar">;
};
