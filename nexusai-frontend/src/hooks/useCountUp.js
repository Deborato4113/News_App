import { useEffect, useRef, useState } from 'react';

// Counts from the previous value up to `target` over `ms`. Respects
// reduced-motion (jumps straight to the number).
export default function useCountUp(target, ms = 700) {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = from.current;
    let raf;
    let t0;
    const step = (t) => {
      if (reduce) { from.current = target; setValue(target); return; }
      if (t0 === undefined) t0 = t;
      const k = Math.min((t - t0) / ms, 1);
      const eased = 1 - (1 - k) ** 3;
      const v = Math.round(start + (target - start) * eased);
      from.current = v;
      setValue(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
}
