import { useLayoutEffect, useRef } from 'react';

// Fades sections in as they scroll into view. Elements opt in with
// data-reveal; they stay visible if JS or IntersectionObserver is missing,
// and for people who asked for reduced motion.
export default function useReveal() {
  const root = useRef(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') return undefined;

    el.classList.add('reveal-ready');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    el.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n));
    return () => { io.disconnect(); el.classList.remove('reveal-ready'); };
  }, []);

  return root;
}
