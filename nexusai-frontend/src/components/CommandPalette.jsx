import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Bot, BrainCircuit, Star, Bookmark, Search, ShieldCheck, CornerDownLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PAGES = [
  { to: '/', label: 'Go to News', icon: Newspaper, words: 'home news dashboard' },
  { to: '/ask', label: 'Go to Ask AI', icon: Bot, words: 'ask ai assistant chat' },
  { to: '/quiz', label: 'Go to Quiz', icon: BrainCircuit, words: 'quiz practice' },
  { to: '/feed', label: 'Go to My feed', icon: Star, words: 'feed following regions' },
  { to: '/saved', label: 'Go to Saved articles', icon: Bookmark, words: 'saved bookmarks' },
  { to: '/search', label: 'Go to Search', icon: Search, words: 'search find' },
  { to: '/admin', label: 'Go to Admin', icon: ShieldCheck, words: 'admin', admin: true },
];

// Ctrl/Cmd+K opens a quick-find box: jump to a page, or ask the assistant.
export default function CommandPalette() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    const toggle = () => { setQuery(''); setSel(0); setOpen((o) => !o); };
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('nexus:palette', toggle);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('nexus:palette', toggle); };
  }, []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = PAGES
      .filter((p) => !p.admin || user?.role === 'admin')
      .filter((p) => !q || `${p.label} ${p.words}`.toLowerCase().includes(q))
      .map((p) => ({ key: p.to, label: p.label, icon: p.icon, run: () => navigate(p.to) }));
    const ask = query.trim().length >= 5
      ? [{ key: 'ask', label: `Ask NexusAI: ${query.trim()}`, icon: Bot, run: () => navigate('/ask', { state: { ask: query.trim() } }) }]
      : [];
    return [...ask, ...pages];
  }, [query, user, navigate]);

  if (!open || !user) return null;

  const close = () => setOpen(false);
  const choose = (item) => { close(); item?.run(); };

  function onKeyDown(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(items.length, 1);
      setSel(next);
      listRef.current?.children[next]?.scrollIntoView?.({ block: 'nearest' });
    }
    if (e.key === 'Enter') { e.preventDefault(); choose(items[sel]); }
  }

  return (
    <div className="cmd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }} role="dialog" aria-modal="true" aria-label="Quick find">
      <div className="cmd">
        <input
          className="cmd-input"
          autoFocus
          placeholder="Jump to a page, or type a question to ask the AI…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSel(0); }}
          onKeyDown={onKeyDown}
          aria-label="Quick find"
        />
        <div className="cmd-list" ref={listRef}>
          {items.length === 0 && <div className="cmd-group">Nothing matches. Type at least 5 characters to ask the AI.</div>}
          {items.map((it, i) => (
            <button key={it.key} type="button" className={`cmd-item${i === sel ? ' sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => choose(it)}>
              <it.icon size={16} aria-hidden="true" /> <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
              {i === sel && <CornerDownLeft size={14} aria-hidden="true" style={{ color: 'var(--text3)' }} />}
            </button>
          ))}
        </div>
        <div className="cmd-foot"><span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> to move</span><span><kbd className="kbd">Enter</kbd> to open</span><span><kbd className="kbd">Esc</kbd> to close</span></div>
      </div>
    </div>
  );
}
