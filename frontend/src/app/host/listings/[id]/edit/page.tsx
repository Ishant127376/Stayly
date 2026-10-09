"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";

import { ListingEditor } from "@/components/host/ListingEditor";

function EditListingContent() {
  const params = useParams<{ id: string }>();
  const listingId = Number(params.id);
  return <ListingEditor listingId={Number.isInteger(listingId) ? listingId : undefined} />;
}

export default function EditListingPage() {
  return <Suspense fallback={null}><EditListingContent /></Suspense>;
}
