import { useState, useEffect, useMemo } from 'react';
import { Bookmark, Search, X, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';
import ArticleSkeleton from '../components/ArticleSkeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

export default function SavedArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [region, setRegion]     = useState('all');

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

  // Drop an article from the list the moment it's unsaved, and offer Undo.
  // Undo saves it on the server again and puts it back where it was.
  function handleSaveChange(articleId, isSaved, article) {
    if (isSaved) return;
    const at = articles.findIndex((a) => a._id === articleId);
    setArticles((prev) => prev.filter((a) => a._id !== articleId));
    toast((t) => (
      <span className="undo-toast">
        Removed from saved
        <button type="button" onClick={async () => {
          toast.dismiss(t.id);
          try {
            await api.post(`/news/${articleId}/save`);
            setArticles((prev) => {
              const next = [...prev];
              next.splice(Math.min(Math.max(at, 0), next.length), 0, article);
              return next;
            });
          } catch {
            toast.error('Could not restore that article.');
          }
        }}>Undo</button>
      </span>
    ), { duration: 5000 });
  }

  const regions = useMemo(() => {
    const counts = {};
    articles.forEach((a) => { if (a.region) counts[a.region] = (counts[a.region] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return articles.filter((a) =>
      (region === 'all' || a.region === region) &&
      (!q || `${a.title} ${a.summary || ''}`.toLowerCase().includes(q))
    );
  }, [articles, filter, region]);

  return (
    <div className="page">
      <PageHeader icon={Bookmark} title="Saved Articles" sub="Your reading list, kept across devices.">
        {!loading && articles.length > 0 && <span className="meta"><b>{articles.length}</b> saved</span>}
      </PageHeader>

      {loading ? (
        <ArticleSkeleton count={3} />
      ) : articles.length === 0 ? (
        <EmptyState icon={Bookmark} title="Nothing saved yet"
          action={<Link to="/" className="btn btn-primary btn-sm"><Newspaper size={14} /> Browse the news</Link>}>
          Tap the bookmark on any article and it will show up here.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <div className="search-field">
              <Search size={15} />
              <input className="input" placeholder="Filter your saved articles…" aria-label="Filter saved articles"
                value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            {filter && <button className="btn btn-ghost btn-sm" onClick={() => setFilter('')}><X size={13} /> Clear</button>}
          </div>

          {regions.length > 1 && (
            <div className="chip-row">
              <button className={`chip ${region === 'all' ? 'active' : ''}`} onClick={() => setRegion('all')}>
                All <span className="count">{articles.length}</span>
              </button>
              {regions.map(([r, n]) => (
                <button key={r} className={`chip region ${region === r ? 'active' : ''}`} onClick={() => setRegion(r)}>
                  {r} <span className="count">{n}</span>
                </button>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState icon={Search} title="No matches">
              Nothing in your saved list matches that filter.
            </EmptyState>
          ) : (
            <div className="grid-list reveal-list" key={`${region}|${filter}`}>
              {visible.map((a, i) => (
                <div key={a._id} style={{ '--i': i }}><ArticleCard article={a} onSaveChange={handleSaveChange} siblings={visible} /></div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
