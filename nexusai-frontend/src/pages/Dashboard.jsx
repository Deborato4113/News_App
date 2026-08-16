import { useState, useEffect, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Newspaper, Search, X, Clock } from 'lucide-react';
import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';
import AskAI from '../components/AskAI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SUGGESTED = ['Mumbai', 'Delhi', 'Bangalore', 'London', 'New York', 'Singapore', 'Tokyo', 'Paris', 'Dubai', 'Sydney'];
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
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>
          Good to see you, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>
          Search any city or region in the world.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: '1rem' }}>
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
              placeholder="Search any city — Tokyo, Cairo, Berlin, Lagos..."
              value={input}
              onChange={e => { setInput(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            />
            {input && (
              <button type="button" onClick={() => { setInput(''); inputRef.current?.focus(); }}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}

            {/* Dropdown */}
            {showDrop && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 50,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {/* Recent searches */}
                {history.length > 0 && (
                  <>
                    <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Recent
                    </div>
                    {history.map(h => (
                      <button key={h} type="button" onMouseDown={() => pickCity(h)}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 14px', background: 'none',
                          border: 'none', color: 'var(--text2)', fontSize: 14, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <Clock size={13} color="var(--text3)" /> {h}
                      </button>
                    ))}
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  </>
                )}

                {/* Suggestions */}
                <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Popular cities
                </div>
                {SUGGESTED.filter(s => s.toLowerCase().includes(input.toLowerCase()) || input === '').map(s => (
                  <button key={s} type="button" onMouseDown={() => pickCity(s)}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 14px', background: 'none',
                      border: 'none', color: 'var(--text)', fontSize: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
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

          <button className="btn btn-ghost" type="button"
            onClick={() => fetchNews(true)} disabled={loading} title="Force refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </form>

      {/* Current region tag */}
      {articles.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Showing news for</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{region}</span>
          {source && (
            <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>
              {source === 'cache' ? '⚡ from cache' : '🌐 live'}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      {articles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[
            { label: 'Articles', value: articles.length, color: 'var(--green)' },
            { label: 'Positive', value: pos,  icon: <TrendingUp size={13} />,   color: '#5DCAA5' },
            { label: 'Negative', value: neg,  icon: <TrendingDown size={13} />, color: 'var(--red)' },
            { label: 'Sources',  value: srcs, icon: <Newspaper size={13} />,    color: 'var(--amber)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '0.9rem 1rem' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                {s.icon}{s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category filter */}
      {articles.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {CATS.map(c => (
            <button key={c} className="btn btn-ghost btn-sm"
              style={cat === c ? { borderColor: 'var(--green)', color: 'var(--green)', background: 'var(--bg3)' } : {}}
              onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Articles */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text2)' }}>
          <div className="spinner-lg" style={{ margin: '0 auto 1rem' }} />
          Fetching & summarizing news for {region}…
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((a, i) => <ArticleCard key={a._id || i} article={a} featured={i === 0} />)}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">📰</div>
          <div className="empty-title">
            {articles.length === 0 ? 'Search a city to get started' : 'No articles in this category'}
          </div>
          <p style={{ fontSize: 14, marginTop: 6 }}>
            {articles.length === 0 ? 'Type any city name above and press Search.' : 'Try another category.'}
          </p>
        </div>
      )}

      {/* AI Chat */}
      <div className="divider" />
      <AskAI region={region} />
    </div>
  );
}
