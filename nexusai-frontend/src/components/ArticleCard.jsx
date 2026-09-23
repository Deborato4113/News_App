import { useState } from 'react';
import { ExternalLink, ShieldAlert, Heart, Bookmark, MessageCircle, Languages, Loader2 } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import CommentSection from './CommentSection';

const BADGE = {
  Politics: 'badge-politics', Business: 'badge-business',
  Technology: 'badge-tech', Sports: 'badge-sports',
  Weather: 'badge-weather', Health: 'badge-health', General: 'badge-general',
};

const BIAS_COLOR = {
  low:    { bg: '#14352a', color: '#5DCAA5' },
  medium: { bg: '#3d2e0a', color: '#f5be6a' },
  high:   { bg: '#3d1a1a', color: '#f08080' },
};

const LANGUAGES = ['Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Spanish', 'French', 'Arabic'];

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function ArticleCard({ article, featured, onSaveChange }) {
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

  const [showComments, setShowComments] = useState(false);

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [translating, setTranslating]   = useState(false);
  const [translated, setTranslated]     = useState(null); // { lang, text }

  async function toggleLike() {
    if (!_id || liking) return;
    setLiking(true);
    try {
      const r = await api.post(`/news/${_id}/like`);
      setLiked(r.data.liked);
      setLikeCount(r.data.likeCount);
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
      toast.success(r.data.saved ? 'Saved' : 'Removed from saved');
      onSaveChange?.(_id, r.data.saved);
    } catch {
      toast.error('Could not update saved articles.');
    }
    setSaving(false);
  }

  async function translate(lang) {
    setShowLangMenu(false);
    setTranslating(true);
    try {
      const r = await api.post('/ai/translate', { text: summary || description || title, targetLang: lang });
      setTranslated({ lang, text: r.data.translated });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Translation failed.');
    }
    setTranslating(false);
  }

  return (
    <div className={`card${featured ? ' card-featured' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className={`badge ${BADGE[category] || 'badge-general'}`}>{category}</span>
        <span className={`sent sent-${sentiment}`}>
          {sentiment === 'pos' ? '↑ positive' : sentiment === 'neg' ? '↓ negative' : '• neutral'}
        </span>
        {biasLevel && biasLevel !== 'low' && (
          <span className="badge" style={{ background: BIAS_COLOR[biasLevel].bg, color: BIAS_COLOR[biasLevel].color }}
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
      <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45 }}>{title}</p>

      {/* Summary */}
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
        {summary || description || 'No summary available.'}
      </p>

      {/* Fact-check note */}
      {factCheckNote && (
        <p style={{
          fontSize: 12, color: '#f5be6a', background: '#3d2e0a', borderRadius: 6,
          padding: '6px 10px', lineHeight: 1.5, display: 'flex', gap: 6, alignItems: 'flex-start',
        }}>
          <ShieldAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          {factCheckNote}
        </p>
      )}

      {/* Translation */}
      {translating && (
        <p style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Loader2 size={12} className="spin" /> Translating…
        </p>
      )}
      {translated && (
        <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px 10px' }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {translated.lang}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{translated.text}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{source?.name || 'Unknown'}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Like */}
          <button onClick={toggleLike} disabled={liking || !_id}
            style={{ background: 'none', border: 'none', cursor: _id ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 4, color: liked ? 'var(--red)' : 'var(--text3)', fontSize: 12 }}>
            <Heart size={13} fill={liked ? 'var(--red)' : 'none'} /> {likeCount || ''}
          </button>

          {/* Save/bookmark */}
          <button onClick={toggleSave} disabled={saving || !_id} title={saved ? 'Remove from saved' : 'Save article'}
            style={{ background: 'none', border: 'none', cursor: _id ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 4, color: saved ? 'var(--green)' : 'var(--text3)', fontSize: 12 }}>
            <Bookmark size={13} fill={saved ? 'var(--green)' : 'none'} /> {saveCount || ''}
          </button>

          {/* Comments toggle */}
          <button onClick={() => setShowComments(s => !s)} disabled={!_id}
            style={{ background: 'none', border: 'none', cursor: _id ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)', fontSize: 12 }}>
            <MessageCircle size={13} /> Comments
          </button>

          {/* Translate */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLangMenu(s => !s)}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)', fontSize: 12 }}>
              <Languages size={13} /> Translate
            </button>
            {showLangMenu && (
              <div style={{
                position: 'absolute', bottom: '120%', right: 0, zIndex: 20,
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 120,
              }}>
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => translate(l)}
                    style={{ width: '100%', textAlign: 'left', padding: '7px 12px', background: 'none',
                      border: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 3 }}>
              Read full <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {showComments && _id && <CommentSection articleId={_id} />}
    </div>
  );
}
