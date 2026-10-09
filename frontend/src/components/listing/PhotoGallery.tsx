"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Grid2X2, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { ListingImage } from "@/types/listing";

const fallbackImage = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85";

type PhotoGalleryProps = { title: string; images: ListingImage[] };

export function PhotoGallery({ title, images }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const orderedImages = images.length ? images : [{ id: 0, url: fallbackImage, display_order: 0 }];

  function move(step: number) {
    setActiveIndex((current) => (current + step + orderedImages.length) % orderedImages.length);
  }

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowRight") setActiveIndex((current) => (current + 1) % orderedImages.length);
      if (event.key === "ArrowLeft") setActiveIndex((current) => (current - 1 + orderedImages.length) % orderedImages.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, orderedImages.length]);

  return <>
    <div className="detail-gallery">
      <GalleryImage image={orderedImages[0]} title={title} className="detail-gallery__hero" priority onClick={() => { setActiveIndex(0); setLightboxOpen(true); }} />
      <div className="detail-gallery__side">
        {orderedImages.slice(1, 3).map((image, index) => <GalleryImage key={image.id} image={image} title={title} className="detail-gallery__tile" onClick={() => { setActiveIndex(index + 1); setLightboxOpen(true); }} />)}
      </div>
      <button className="show-photos-button" type="button" onClick={() => setLightboxOpen(true)}><Grid2X2 size={16} /> Show all photos</button>
    </div>
    {lightboxOpen && <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${title} photo gallery`}>
      <button className="lightbox-close" type="button" onClick={() => setLightboxOpen(false)} aria-label="Close gallery"><X size={22} /></button>
      <button className="lightbox-arrow lightbox-arrow--left" type="button" onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft size={30} /></button>
      <div className="lightbox-image"><Image src={orderedImages[activeIndex].url} alt={`${title}, photo ${activeIndex + 1}`} fill sizes="90vw" priority /></div>
      <button className="lightbox-arrow lightbox-arrow--right" type="button" onClick={() => move(1)} aria-label="Next photo"><ChevronRight size={30} /></button>
      <p>{activeIndex + 1} / {orderedImages.length}</p>
    </div>}
  </>;
}

function GalleryImage({ image, title, className, priority = false, onClick }: { image: ListingImage; title: string; className: string; priority?: boolean; onClick: () => void }) {
  const [src, setSrc] = useState(image.url);
  return <button className={`gallery-image ${className}`} type="button" onClick={onClick} aria-label={`Open ${title} photo`}>
    <Image src={src} alt={`${title} photo`} fill priority={priority} sizes="(max-width: 760px) 94vw, 50vw" onError={() => setSrc(fallbackImage)} />
  </button>;
}