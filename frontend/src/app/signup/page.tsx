"use client";

import { Suspense } from "react";

import { AuthForm } from "@/components/auth/AuthForm";
import { Header } from "@/components/layout/Header";
import type { SearchFilters } from "@/types/listing";

const emptyFilters: SearchFilters = { location: "", check_in: "", check_out: "", guests: null, min_price: "", max_price: "", property_type: "", amenities: [], minimum_rating: "", page: 1 };

export default function SignupPage() {
  return <><Header filters={emptyFilters} onSearch={() => undefined} /><Suspense fallback={<main className="auth-page"><div className="auth-card auth-card--loading" /></main>}><AuthForm mode="signup" /></Suspense></>;
}
