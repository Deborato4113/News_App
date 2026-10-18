import { useEffect, useState } from 'react';
import { History as HistoryIcon, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';
import ArticleSkeleton from '../components/ArticleSkeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { readSeconds } from '../lib/text';

function dayLabel(d) {
  const t = new Date(d);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (t.toDateString() === today.toDateString()) return 'Today';
  if (t.toDateString() === yest.toDateString()) return 'Yesterday';
  return t.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function History() {
  const [articles, setArticles] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  async function load(page) {
    try {
      const r = await api.get('/news/history', { params: { page, limit: 20 } });
      setArticles((cur) => (page === 1 ? r.data.articles : [...cur, ...r.data.articles]));
      setMeta({ total: r.data.total, page: r.data.page, totalPages: r.data.totalPages });
    } catch {
      toast.error('Could not load your reading history.');
    }
    setLoading(false);
    setMore(false);
  }

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await api.get('/news/history', { params: { page: 1, limit: 20 } });
        if (!live) return;
        setArticles(r.data.articles);
        setMeta({ total: r.data.total, page: r.data.page, totalPages: r.data.totalPages });
      } catch {
        if (live) toast.error('Could not load your reading history.');
      }
      if (live) setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  const minutes = Math.max(1, Math.round(articles.reduce((s, a) => s + readSeconds(a.summary || a.description || ''), 0) / 60));
  const groups = [];
  for (const a of articles) {
    const label = dayLabel(a.readAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(a);
    else groups.push({ label, items: [a] });
  }

  return (
    <div className="page">
      <PageHeader icon={HistoryIcon} title="Reading history" sub="Stories you opened in the reader. Kept for 90 days.">
        {!loading && meta.total > 0 && (
          <span className="meta"><b>{meta.total}</b> read · about <b>{minutes} min</b> of reading (estimated)</span>
        )}
      </PageHeader>

      {loading ? (
        <ArticleSkeleton count={3} />
      ) : articles.length === 0 ? (
        <EmptyState icon={Newspaper} title="Nothing read yet"
          action={<Link to="/" className="btn btn-primary btn-sm"><Newspaper size={14} /> Browse the news</Link>}>
          Open a story in the reader and it will be listed here.
        </EmptyState>
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.label} className="hist-day">
              <h2 className="hist-label">{g.label}</h2>
              <div className="grid-list">
                {g.items.map((a) => <ArticleCard key={a._id} article={a} siblings={articles} />)}
              </div>
            </section>
          ))}
          {meta.page < meta.totalPages && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button className="btn btn-ghost" disabled={more} onClick={() => { setMore(true); load(meta.page + 1); }}>
                {more ? 'Loading…' : 'Load older'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
