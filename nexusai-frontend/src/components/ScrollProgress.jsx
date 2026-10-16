import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

// A thin reading-progress bar at the top and a back-to-top button.
export default function ScrollProgress() {
  const [p, setP] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
      setShow(window.scrollY > 700);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="scroll-bar" aria-hidden="true"><i style={{ '--p': p }} /></div>
      <button
        type="button"
        className={`to-top${show ? ' show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        tabIndex={show ? 0 : -1}
      >
        <ArrowUp size={18} />
      </button>
    </>
  );
}
