import { useState, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function CommentSection({ articleId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [posting, setPosting]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get(`/news/${articleId}/comments`);
        if (!cancelled) setComments(r.data.comments);
      } catch {
        if (!cancelled) toast.error('Could not load comments.');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [articleId]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      const r = await api.post(`/news/${articleId}/comments`, { text: text.trim() });
      setComments(c => [r.data, ...c]);
      setText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post comment.');
    }
    setPosting(false);
  }

  async function remove(commentId) {
    try {
      await api.delete(`/news/comments/${commentId}`);
      setComments(c => c.filter(x => x.id !== commentId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete comment.');
    }
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
      <form onSubmit={submit} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          className="input"
          placeholder="Add a comment…"
          value={text}
          maxLength={500}
          onChange={e => setText(e.target.value)}
          style={{ fontSize: 13, padding: '7px 10px' }}
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={posting || !text.trim()}>
          {posting ? <div className="spinner" /> : <Send size={13} />}
        </button>
      </form>

      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>Loading comments…</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>No comments yet — be the first.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.user.name}</span>{' '}
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>{timeAgo(c.createdAt)}</span>
                <p style={{ color: 'var(--text2)' }}>{c.text}</p>
              </div>
              {(user?.id === c.user.id || user?.role === 'admin') && (
                <button
                  onClick={() => remove(c.id)}
                  title="Delete comment"
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
