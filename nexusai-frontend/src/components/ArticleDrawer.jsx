import { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, ShieldAlert } from 'lucide-react';
import CommentSection from './CommentSection';

const BADGE = {
  Politics: 'badge-politics', Business: 'badge-business', Technology: 'badge-tech',
  Sports: 'badge-sports', Weather: 'badge-weather', Health: 'badge-health', General: 'badge-general',
};

function when(d) {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

// Slide-in reading panel: full summary, fact-check note and discussion, with
// J/K or the arrow keys to move between the articles of the list it came from.
export default function ArticleDrawer({ article, position, total, onPrev, onNext, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const returnTo = document.activeElement;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      if (returnTo instanceof HTMLElement) returnTo.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName;
      if (e.key === 'Escape') { onClose(); return; }
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'j' || e.key === 'ArrowRight') onNext?.();
      if (e.key === 'k' || e.key === 'ArrowLeft') onPrev?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev]);

  if (!article) return null;
  const { _id, title, summary, description, source, publishedAt, category, sentiment, url, biasLevel, factCheckNote } = article;

  return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Article details">
        <div className="drawer-bar">
          <span className="meta">{position} of {total}</span>
          <div className="ph-actions">
            <button className="act" onClick={onPrev || undefined} disabled={!onPrev} aria-label="Previous article" title="Previous (K)"><ChevronLeft size={16} /></button>
            <button className="act" onClick={onNext || undefined} disabled={!onNext} aria-label="Next article" title="Next (J)"><ChevronRight size={16} /></button>
            <button ref={closeRef} className="act" onClick={onClose} aria-label="Close" title="Close (Esc)"><X size={16} /></button>
          </div>
        </div>

        <div className="drawer-body">
          <div className="ph-actions" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            <span className={`badge ${BADGE[category] || 'badge-general'}`}>{category}</span>
            <span className={`sent sent-${sentiment}`}>
              {sentiment === 'pos' ? '↑ positive' : sentiment === 'neg' ? '↓ negative' : '• neutral'}
            </span>
            {biasLevel && biasLevel !== 'low' && <span className="badge badge-general"><ShieldAlert size={11} style={{ marginRight: 3 }} />{biasLevel} bias</span>}
          </div>

          <h2 className="drawer-title">{title}</h2>
          <p className="meta" style={{ margin: '8px 0 16px' }}>{source?.name || 'Unknown source'}{when(publishedAt) && ` · ${when(publishedAt)}`}</p>

          <p className="drawer-text">{summary || description || 'No summary available.'}</p>

          {factCheckNote && (
            <p className="why" style={{ borderColor: 'var(--amber)', color: '#f5be6a' }}>
              <ShieldAlert size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />{factCheckNote}
            </p>
          )}

          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
              Read the full article <ExternalLink size={13} />
            </a>
          )}

          <h3 className="card-title" style={{ marginTop: 26 }}>Discussion</h3>
          {_id ? <CommentSection articleId={_id} /> : <p className="meta">Comments are unavailable for this article.</p>}
        </div>

        <div className="drawer-foot meta"><kbd className="kbd">J</kbd> next · <kbd className="kbd">K</kbd> previous · <kbd className="kbd">Esc</kbd> close</div>
      </aside>
    </div>
  );
}
