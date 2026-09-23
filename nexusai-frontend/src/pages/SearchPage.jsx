import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';
import toast from 'react-hot-toast';

export default function SearchPage() {
  const [q, setQ]               = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await api.get('/news/search', { params: { q: q.trim(), limit: 20 } });
      setArticles(r.data.articles);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed.');
    }
    setLoading(false);
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <SearchIcon size={22} color="var(--green)" />
          <h1 className="display" style={{ fontSize: 26 }}>Search News</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>
          Full-text search across every article that's already been fetched (any region).
        </p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <input className="input" placeholder="Search by keyword — e.g. 'election', 'monsoon', 'startup'"
          value={q} onChange={e => setQ(e.target.value)} autoFocus />
        <button className="btn btn-primary" type="submit" disabled={loading || !q.trim()}>
          {loading ? <div className="spinner" /> : <SearchIcon size={15} />}
          Search
        </button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text2)' }}>
          <div className="spinner-lg" style={{ margin: '0 auto 1rem' }} />
          Searching…
        </div>
      ) : searched && articles.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No results</div>
          <p style={{ fontSize: 14, marginTop: 6 }}>
            Try a different keyword, or fetch more news first from the Dashboard — search only covers articles already cached.
          </p>
        </div>
      ) : articles.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {articles.map((a) => <ArticleCard key={a._id} article={a} />)}
        </div>
      ) : null}
    </div>
  );
}
