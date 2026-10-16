import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Keyboard, X } from 'lucide-react';

const GO = { n: '/', a: '/ask', q: '/quiz', f: '/feed', s: '/saved', '/': '/search' };

const ROWS = [
  ['Ctrl K', 'Quick find'],
  ['?', 'Show this list'],
  ['g then n', 'Go to News'],
  ['g then a', 'Go to Ask AI'],
  ['g then q', 'Go to Quiz'],
  ['g then f', 'Go to My feed'],
  ['g then s', 'Go to Saved'],
  ['g then /', 'Go to Search'],
  ['/', 'Focus the search box (Search page)'],
  ['J / K', 'Next / previous article (when reading)'],
  ['Esc', 'Close any panel'],
];

function isTyping(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

// Global keyboard shortcuts plus the "?" cheat sheet.
export default function Shortcuts() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pendingG = useRef(0);

  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === '?') { e.preventDefault(); setOpen((o) => !o); return; }
      if (e.key === 'Escape') { setOpen(false); return; }
      const now = Date.now();
      if (e.key === 'g') { pendingG.current = now; return; }
      if (pendingG.current && now - pendingG.current < 1200 && GO[e.key]) {
        e.preventDefault();
        pendingG.current = 0;
        navigate(GO[e.key]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  if (!open) return null;
  return (
    <div className="cmd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" style={{ width: 'min(460px, 100%)' }}>
        <div className="ph" style={{ marginBottom: 12 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Keyboard size={18} color="var(--green)" /> Keyboard shortcuts</h2>
          <button className="chip-x" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
        </div>
        <dl className="keys">
          {ROWS.map(([k, d]) => (
            <div key={k}>
              <dt>
                {k.split(' then ').map((part, i) => (
                  <span key={i}>{i > 0 && <em> then </em>}<kbd className="kbd">{part}</kbd></span>
                ))}
              </dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
