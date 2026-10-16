import { useState, useEffect, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Newspaper, Search, X, Clock } from 'lucide-react';
import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';
import AskAI from '../components/AskAI';
import HeadlineTicker from '../components/HeadlineTicker';
import ArticleSkeleton from '../components/ArticleSkeleton';
import useCountUp from '../hooks/useCountUp';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SUGGESTED = ['Mumbai', 'Delhi', 'Bangalore', 'London', 'New York', 'Singapore', 'Tokyo', 'Paris', 'Dubai', 'Sydney'];
function StatTile({ label, value, color, icon }) {
  const n = useCountUp(value);
  return (
    <div className="card" style={{ padding: '0.9rem 1rem' }}>
      <div style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      <div className="stat-n" style={{ color }}>{icon}{n}</div>
    </div>
  );
}

const CATS = ['All', 'Politics', 'Business', 'Technology', 'Sports', 'Weather', 'Health'];

export default function Dashboard() {
  const { user } = useAuth();
  const [region,   setRegion]   = useState('Mumbai');
  const [input,    setInput]    = useState('Mumbai');
  const [cat,      setCat]      = useState('All');
  const [articles, setArticles] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [source,   setSource]   = useState('');
  const [history,  setHistory]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexusai_history') || '[]'); } catch { return []; }
  });
  const [showDrop, setShowDrop] = useState(false);
  const inputRef = useRef();
  const [dateline] = useState(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }));

  useEffect(() => { fetchNews(false, 'Mumbai'); }, []);

  function saveHistory(city) {
    const updated = [city, ...history.filter(h => h.toLowerCase() !== city.toLowerCase())].slice(0, 5);
    setHistory(updated);
    localStorage.setItem('nexusai_history', JSON.stringify(updated));
  }

  async function fetchNews(forceRefresh = false, cityOverride = null) {
    const city = cityOverride || region;
    if (!city.trim()) return;
    setLoading(true);
    setCat('All');
    setShowDrop(false);
    try {
      let r;
      if (forceRefresh) {
        r = await api.post('/news/refresh', { region: city });
        toast.success(`Refreshed news for ${city}!`);
      } else {
        r = await api.get('/news', { params: { region: city, limit: 12 } });
      }
      setArticles(r.data.articles);
      setSource(r.data.source);
      saveHistory(city);
    } catch {
      toast.error('Could not load news. Is your backend running?');
    }
    setLoading(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setRegion(input.trim());
    fetchNews(false, input.trim());
  }

  function pickCity(city) {
    setInput(city);
    setRegion(city);
    fetchNews(false, city);
  }

  const filtered = cat === 'All' ? articles : articles.filter(a => a.category === cat);
  const pos  = articles.filter(a => a.sentiment === 'pos').length;
  const neg  = articles.filter(a => a.sentiment === 'neg').length;
  const srcs = new Set(articles.map(a => a.source?.name).filter(Boolean)).size;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="dateline">{dateline}</div>
        <h1 className="page-title">Good to see you, {user?.name?.split(' ')[0]}</h1>
        <p className="page-sub">Pick a city to read what is happening there, or ask the AI about it.</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text3)', pointerEvents: 'none',
            }} />
            <input
              ref={inputRef}
              className="input"
              style={{ paddingLeft: 36, paddingRight: 36 }}
              placeholder="Search any city: Tokyo, Cairo, Berlin, Lagos…"
              aria-label="City or region"
              value={input}
              onChange={e => { setInput(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            />
            {input && (
              <button type="button" aria-label="Clear" onClick={() => { setInput(''); inputRef.current?.focus(); }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}

            {showDrop && (
              <div className="menu" style={{ top: '110%', left: 0, right: 0 }}>
                {history.length > 0 && (
                  <>
                    <div className="menu-head">Recent searches</div>
                    {history.map(h => (
                      <button key={h} type="button" className="menu-item" onMouseDown={() => pickCity(h)}>
                        <Clock size={13} color="var(--text3)" /> {h}
                      </button>
                    ))}
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  </>
                )}
                <div className="menu-head">Popular cities</div>
                {SUGGESTED.filter(s => s.toLowerCase().includes(input.toLowerCase()) || input === '').map(s => (
                  <button key={s} type="button" className="menu-item" onMouseDown={() => pickCity(s)}>
                    <Search size={13} color="var(--text3)" /> {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <div className="spinner" /> : <Search size={15} />}
            {loading ? 'Loading…' : 'Search'}
          </button>

          <button className="btn btn-ghost" type="button" aria-label="Fetch the latest news again"
            onClick={() => fetchNews(true)} disabled={loading} title="Fetch the latest news again">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </form>

      {/* One-tap cities */}
      <div className="city-chips" role="group" aria-label="Quick cities">
        {SUGGESTED.slice(0, 6).map(c => (
          <button key={c} type="button" className={`chip${region.toLowerCase() === c.toLowerCase() ? ' active' : ''}`}
            onClick={() => pickCity(c)} disabled={loading}>
            {c}
          </button>
        ))}
      </div>

      {/* Latest headlines strip */}
      {!loading && <HeadlineTicker articles={articles} />}

      {/* Current region tag */}
      {articles.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Showing news for</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{region}</span>
          {source && (
            <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>
              {source === 'cache' ? 'Saved copy, loads instantly' : 'Fetched just now'}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      {articles.length > 0 && !loading && (
        <div className="stat-grid">
          <StatTile label="Articles" value={articles.length} color="var(--green)" />
          <StatTile label="Positive tone" value={pos} icon={<TrendingUp size={15} />} color="#5DCAA5" />
          <StatTile label="Negative tone" value={neg} icon={<TrendingDown size={15} />} color="var(--red)" />
          <StatTile label="Sources" value={srcs} icon={<Newspaper size={15} />} color="var(--amber)" />
        </div>
      )}

      {/* Category filter */}
      {articles.length > 0 && !loading && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }} role="group" aria-label="Category">
          {CATS.map(c => {
            const n = c === 'All' ? articles.length : articles.filter(a => a.category === c).length;
            if (c !== 'All' && n === 0) return null;
            return (
              <button key={c} type="button" className={`chip${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>
                {c} <span className="count">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Articles */}
      {loading ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>Fetching and summarising news for {region}…</p>
          <ArticleSkeleton count={4} />
        </>
      ) : filtered.length > 0 ? (
        <div className="reveal-list" key={`${region}-${cat}`} style={{ display: 'grid', gap: 10 }}>
          {filtered.map((a, i) => <ArticleCard key={a._id || i} article={a} featured={i === 0} index={i} />)}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">📰</div>
          <div className="empty-title">
            {articles.length === 0 ? 'No news yet for this place' : 'No articles in this category'}
          </div>
          <p style={{ fontSize: 14, marginTop: 6 }}>
            {articles.length === 0 ? 'Pick one of the cities above, or type any city and press Search.' : 'Pick another category above.'}
          </p>
        </div>
      )}

      {/* AI Chat */}
      <div className="divider" />
      <AskAI region={region} />
    </div>
  );
}
