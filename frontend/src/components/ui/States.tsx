import { AlertCircle, Compass, RefreshCw, SearchX } from "lucide-react";

type StateProps = { onReset: () => void };

export function EmptyState({ onReset }: StateProps) {
  return <div className="empty-state"><span className="state-icon"><SearchX size={26} /></span><h2>No stays found</h2><p>Try changing your dates or adjusting your filters.</p><button className="primary-button" type="button" onClick={onReset}>Clear filters</button></div>;
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="empty-state"><span className="state-icon state-icon--error"><AlertCircle size={26} /></span><h2>We could not load stays</h2><p>Something interrupted the connection. Please try again.</p><button className="primary-button" type="button" onClick={onRetry}><RefreshCw size={16} /> Try again</button></div>;
}

export function ExploreIntro() {
  return <section className="explore-intro"><div><span className="eyebrow">Find your next stay</span><h1>Make room for a little more <em>away.</em></h1></div><div className="intro-note"><Compass size={18} /><span>Handpicked places for every kind of escape.</span></div></section>;
}
