import { useState } from 'react';
import { ExternalLink, ShieldAlert, Heart, Bookmark, MessageCircle, PanelRightOpen } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import CommentSection from './CommentSection';
import useReader from '../hooks/useReader';
import useLibrary from '../hooks/useLibrary';
import { TranslateMenu, ListenShare } from './DrawerTools';

const BADGE = {
  Politics: 'badge-politics', Business: 'badge-business',
  Technology: 'badge-tech', Sports: 'badge-sports',
  Weather: 'badge-weather', Health: 'badge-health', General: 'badge-general',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function ArticleCard({ article, featured, onSaveChange, index = 0, siblings }) {
  const reader = useReader();
  const { readIds } = useLibrary();
  const {
    _id, title, summary, description, source, publishedAt, category, sentiment, url,
    biasLevel, factCheckNote,
    // The backend now annotates every article with the current user's own
    // like/save state (see newsController.js's `annotate` helper) instead
    // of leaving the frontend to guess — so these start correct on load.
    likeCount: initialLikeCount = 0, likedByMe: initialLiked = false,
    saveCount: initialSaveCount = 0, savedByMe: initialSaved = false,
  } = article;

  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked]         = useState(initialLiked);
  const [liking, setLiking]       = useState(false);

  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [saved, setSaved]         = useState(initialSaved);
  const [saving, setSaving]       = useState(false);

  const [likePop, setLikePop] = useState(0);
  const [savePop, setSavePop] = useState(0);
  const [showComments, setShowComments] = useState(false);

  const [translated, setTranslated] = useState(null); // { lang, native, tag, cloud, rtl, text }

  async function toggleLike() {
    if (!_id || liking) return;
    setLiking(true);
    try {
      const r = await api.post(`/news/${_id}/like`);
      setLiked(r.data.liked);
      setLikeCount(r.data.likeCount);
      if (r.data.liked) setLikePop((n) => n + 1);
    } catch {
      toast.error('Could not update like.');
    }
    setLiking(false);
  }

  async function toggleSave() {
    if (!_id || saving) return;
    setSaving(true);
    try {
      const r = await api.post(`/news/${_id}/save`);
      setSaved(r.data.saved);
      setSaveCount(r.data.saveCount);
      if (r.data.saved) setSavePop((n) => n + 1);
      if (onSaveChange) {
        // the parent list owns the feedback (it can restore the card on undo)
        onSaveChange(_id, r.data.saved, article);
      } else if (r.data.saved) {
        toast.success('Saved');
      } else {
        toast((t) => (
          <span className="undo-toast">
            Removed from saved
            <button type="button" onClick={() => { toast.dismiss(t.id); toggleSave(); }}>Undo</button>
          </span>
        ), { duration: 5000 });
      }
    } catch {
      toast.error('Could not update saved articles.');
    }
    setSaving(false);
  }

  return (
    <div className={`card article${featured ? ' card-featured' : ''}${_id && readIds.has(_id) ? ' is-read' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, '--i': index }}>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className={`badge ${BADGE[category] || 'badge-general'}`}>{category}</span>
        <span className={`sent sent-${sentiment}`}>
          {sentiment === 'pos' ? '↑ positive' : sentiment === 'neg' ? '↓ negative' : '• neutral'}
        </span>
        {biasLevel && biasLevel !== 'low' && (
          <span className={`badge bias-${biasLevel}`}
            title="AI-estimated framing bias — not a definitive judgment">
            <ShieldAlert size={11} style={{ marginRight: 3 }} />
            {biasLevel} bias
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>
          {timeAgo(publishedAt)}
        </span>
      </div>

      {/* Title */}
      <h3 className="article-title">
        {url ? <a href={url} target="_blank" rel="noopener noreferrer">{title}</a> : title}
      </h3>

      {/* Summary */}
      <p className="a-summary" style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
        {summary || description || 'No summary available.'}
      </p>

      {/* Fact-check note */}
      {factCheckNote && (
        <p className="factnote">
          <ShieldAlert size={13} />
          {factCheckNote}
        </p>
      )}

      {/* Translation */}
      {translated && (
        <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px 10px' }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {translated.lang} · <span lang={translated.tag}>{translated.native}</span>
          </p>
          <p lang={translated.tag} dir={translated.rtl ? 'rtl' : undefined} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{translated.text}</p>
          <div style={{ marginTop: 8 }}><ListenShare article={article} translated={translated} showShare={false} /></div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{source?.name || 'Unknown'}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <button className={`act${liked ? ' on-red' : ''}`} onClick={toggleLike} disabled={liking || !_id}
            aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} title={liked ? 'Unlike' : 'Like'}>
            <Heart key={likePop} size={14} fill={liked ? 'currentColor' : 'none'} className={likePop ? 'pop' : ''} /> {likeCount || ''}
          </button>

          <button className={`act${saved ? ' on-green' : ''}`} onClick={toggleSave} disabled={saving || !_id}
            aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save article'} title={saved ? 'Remove from saved' : 'Save article'}>
            <Bookmark key={savePop} size={14} fill={saved ? 'currentColor' : 'none'} className={savePop ? 'pop' : ''} /> {saveCount || ''}
          </button>

          <button className="act" onClick={() => reader.open(article, siblings)} aria-label="Open in reader" title="Open in reader">
            <PanelRightOpen size={14} /> Read
          </button>

          <button className="act" onClick={() => setShowComments(s => !s)} disabled={!_id} aria-expanded={showComments}>
            <MessageCircle size={14} /> Comments
          </button>

          <TranslateMenu variant="card" article={article} value={translated} onChange={setTranslated} />

          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="act" style={{ color: 'var(--green)' }}>
              Read full article <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {showComments && _id && <CommentSection articleId={_id} />}
    </div>
  );
}
