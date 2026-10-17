import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// A small "Get started" bar that appears once the hero is scrolled away,
// and hides again when the big closing call-to-action is on screen.
export default function StickyCta({ heroRef, endRef }) {
  const [pastHero, setPastHero] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const a = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), { threshold: 0 });
    const b = new IntersectionObserver(([e]) => setAtEnd(e.isIntersecting), { threshold: 0.2 });
    if (heroRef.current) a.observe(heroRef.current);
    if (endRef.current) b.observe(endRef.current);
    return () => { a.disconnect(); b.disconnect(); };
  }, [heroRef, endRef]);

  const show = pastHero && !atEnd;
  return (
    <div className={`sticky-cta${show ? ' show' : ''}`} aria-hidden={!show}>
      <span>Ask the news anything.</span>
      <Link to="/signup" className="btn btn-primary btn-sm" tabIndex={show ? 0 : -1}>Get started free <ArrowRight size={14} aria-hidden="true" /></Link>
    </div>
  );
}
