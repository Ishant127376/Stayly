import { ArrowLeft, ArrowRight } from "lucide-react";

type PaginationProps = {
  page: number;
  pages: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, pages, onChange }: PaginationProps) {
  if (pages <= 1) return null;
  return <nav className="pagination" aria-label="Listing pages">
    <button className="page-button" type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page"><ArrowLeft size={16} /></button>
    <span>Page <strong>{page}</strong> of {pages}</span>
    <button className="page-button" type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page"><ArrowRight size={16} /></button>
  </nav>;
}
