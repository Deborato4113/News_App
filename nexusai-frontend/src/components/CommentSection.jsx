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
    <div className="comments">
      <form onSubmit={submit} className="cform">
        <input className="input" placeholder="Add a comment…" aria-label="Add a comment"
          value={text} maxLength={500} onChange={e => setText(e.target.value)} />
        {text.length > 400 && <span className="ccount">{500 - text.length}</span>}
        <button className="btn btn-primary btn-sm" type="submit" disabled={posting || !text.trim()} aria-label="Post comment">
          {posting ? <div className="spinner" /> : <Send size={13} />}
        </button>
      </form>

      {loading ? (
        <div className="sk-list" aria-busy="true">
          <div className="skeleton sk-line" style={{ width: '60%' }} />
          <div className="skeleton sk-line" style={{ width: '85%' }} />
        </div>
      ) : comments.length === 0 ? (
        <p className="meta">No comments yet. Start the conversation.</p>
      ) : (
        <div className="clist">
          {comments.map(c => (
            <div key={c.id} className="comment">
              <span className="avatar">{(c.user.name || '?')[0].toUpperCase()}</span>
              <div className="comment-body">
                <b>{c.user.name}</b><time>{timeAgo(c.createdAt)}</time>
                <p>{c.text}</p>
              </div>
              {(user?.id === c.user.id || user?.role === 'admin') && (
                <button className="comment-x" onClick={() => remove(c.id)} title="Delete comment" aria-label="Delete comment">
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
