import { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Clock, X } from 'lucide-react';
import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';
import ArticleSkeleton from '../components/ArticleSkeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

const KEY = 'nexusai_recent_searches';
const SUGGESTIONS = ['election', 'monsoon', 'startup', 'cricket', 'inflation'];

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]').slice(0, 6); } catch { return []; }
}
function saveRecent(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}

export default function SearchPage() {
  const [q, setQ]               = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState('');
  const [recent, setRecent]     = useState(loadRecent);
  const inputRef = useRef(null);

  // "/" jumps to the search box from anywhere on this page.
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function run(term) {
    const query = term.trim();
    if (!query) return;
    setQ(query);
    setLoading(true);
    setSearched(query);
    try {
      const r = await api.get('/news/search', { params: { q: query, limit: 20 } });
      setArticles(r.data.articles);
      const next = [query, ...recent.filter((x) => x.toLowerCase() !== query.toLowerCase())].slice(0, 6);
      setRecent(next);
      saveRecent(next);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed.');
      setArticles([]);
    }
    setLoading(false);
  }

  function clearRecent() { setRecent([]); saveRecent([]); }

  return (
    <div className="page">
      <PageHeader icon={SearchIcon} title="Search News"
        sub="Full-text search across every article that's already been fetched, in any region." />

      <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="toolbar">
        <div className="search-field">
          <SearchIcon size={16} />
          <input ref={inputRef} className="input" aria-label="Search news" autoFocus
            placeholder="Try 'election', 'monsoon' or 'startup'"
            value={q} onChange={(e) => setQ(e.target.value)} />
          {!q && <span className="kbd">/</span>}
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading || !q.trim()}>
          {loading ? <div className="spinner" /> : <SearchIcon size={15} />} Search
        </button>
      </form>

      {loading ? (
        <ArticleSkeleton count={4} />
      ) : !searched ? (
        <div className="reveal-list">
          {recent.length > 0 && (
            <div style={{ marginBottom: '1.25rem', '--i': 0 }}>
              <div className="toolbar" style={{ marginBottom: 8 }}>
                <span className="meta"><Clock size={12} style={{ verticalAlign: '-1px' }} /> Recent</span>
                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 12 }} onClick={clearRecent}><X size={11} /> Clear</button>
              </div>
              <div className="chip-row">
                {recent.map((r) => <button key={r} className="chip" onClick={() => run(r)}>{r}</button>)}
              </div>
            </div>
          )}
          <div style={{ '--i': 1 }}>
            <p className="meta" style={{ marginBottom: 8 }}>Popular topics</p>
            <div className="chip-row">
              {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => run(s)}>{s}</button>)}
            </div>
          </div>
        </div>
      ) : articles.length === 0 ? (
        <EmptyState icon={SearchIcon} title={`No results for “${searched}”`}>
          Try a different keyword, or fetch more news from the Dashboard first. Search only covers articles already cached.
        </EmptyState>
      ) : (
        <>
          <p className="meta" style={{ marginBottom: 10 }}><b>{articles.length}</b> result{articles.length === 1 ? '' : 's'} for “{searched}”</p>
          <div className="grid-list reveal-list">
            {articles.map((a, i) => <div key={a._id} style={{ '--i': i }}><ArticleCard article={a} siblings={articles} /></div>)}
          </div>
        </>
      )}
    </div>
  );
}
