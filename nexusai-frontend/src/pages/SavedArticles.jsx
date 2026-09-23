import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';
import toast from 'react-hot-toast';

export default function SavedArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get('/news/saved', { params: { limit: 50 } });
        if (!cancelled) setArticles(r.data.articles);
      } catch {
        if (!cancelled) toast.error('Could not load saved articles.');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Optimistically drop an article from the list the moment it's unsaved,
  // instead of waiting for a full page reload.
  function handleSaveChange(articleId, isSaved) {
    if (!isSaved) setArticles((prev) => prev.filter((a) => a._id !== articleId));
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
        <Bookmark size={22} color="var(--green)" />
        <h1 className="display" style={{ fontSize: 26 }}>Saved Articles</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text2)' }}>
          <div className="spinner-lg" style={{ margin: '0 auto 1rem' }} />
          Loading your saved articles…
        </div>
      ) : articles.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔖</div>
          <div className="empty-title">No saved articles yet</div>
          <p style={{ fontSize: 14, marginTop: 6 }}>Tap the bookmark icon on any article to save it for later.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {articles.map((a) => (
            <ArticleCard key={a._id} article={a} onSaveChange={handleSaveChange} />
          ))}
        </div>
      )}
    </div>
  );
}
