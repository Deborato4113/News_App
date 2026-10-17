import { useEffect, useState } from 'react';

// Cycles through a few phrases. All phrases sit in one grid cell, so the line
// is always as wide as the longest one and nothing jumps when it changes.
export default function RotatingWord({ words, every = 2600 }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), every);
    return () => clearInterval(t);
  }, [words.length, every]);

  return (
    <span className="rot">
      {words.map((w, n) => (
        <span key={w} className={`rot-w${n === i ? ' on' : ''}`} aria-hidden={n !== i}>{w}</span>
      ))}
    </span>
  );
}
