import { useState, useEffect } from 'react';
import { ShieldCheck, Flag, Trash2, RefreshCw, Users, Newspaper, MessageSquare, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats]           = useState(null);
  const [flagged, setFlagged]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshRegions, setRefreshRegions] = useState('mumbai, delhi, bangalore');
  const [refreshing, setRefreshing] = useState(false);

  // Reusable loader for manual re-triggers (e.g. after a bulk refresh).
  // Click handlers can call setState synchronously without issue — it's
  // only calling it directly inside an effect body that's a problem.
  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, flaggedRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/articles', { params: { flagged: true, limit: 20 } }),
      ]);
      setStats(statsRes.data);
      setFlagged(flaggedRes.data.articles);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load admin data.');
    }
    setLoading(false);
  }

  // Initial load on mount — doesn't call loadAll() (which sets loading=true
  // synchronously) since `loading` already starts true; only sets it back
  // to false once the data has actually arrived.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, flaggedRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/articles', { params: { flagged: true, limit: 20 } }),
        ]);
        if (cancelled) return;
        setStats(statsRes.data);
        setFlagged(flaggedRes.data.articles);
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || 'Could not load admin data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function unflag(id) {
    try {
      await api.post(`/admin/articles/${id}/unflag`);
      setFlagged(f => f.filter(a => a._id !== id));
      toast.success('Unflagged');
    } catch {
      toast.error('Could not unflag article.');
    }
  }

  async function removeArticle(id) {
    if (!confirm('Delete this article permanently?')) return;
    try {
      await api.delete(`/admin/articles/${id}`);
      setFlagged(f => f.filter(a => a._id !== id));
      toast.success('Article deleted');
    } catch {
      toast.error('Could not delete article.');
    }
  }

  async function bulkRefresh(e) {
    e.preventDefault();
    const regions = refreshRegions.split(',').map(r => r.trim()).filter(Boolean);
    if (!regions.length) return;
    setRefreshing(true);
    try {
      const r = await api.post('/admin/refresh', { regions });
      const okCount = r.data.results.filter(x => x.ok).length;
      toast.success(`Refreshed ${okCount}/${regions.length} regions`);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk refresh failed.');
    }
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text2)' }}>
          <div className="spinner-lg" style={{ margin: '0 auto 1rem' }} />
          Loading admin dashboard…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
        <ShieldCheck size={22} color="var(--green)" />
        <h1 className="display" style={{ fontSize: 26 }}>Admin Dashboard</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: '1.5rem' }}>
          <div className="stat-tile">
            <div className="stat-label"><Users size={11} style={{ marginRight: 4 }} />Users</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label"><Newspaper size={11} style={{ marginRight: 4 }} />Articles</div>
            <div className="stat-value">{stats.totalArticles}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Last 24h</div>
            <div className="stat-value">{stats.articlesLast24h}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label"><Flag size={11} style={{ marginRight: 4 }} />Flagged</div>
            <div className="stat-value" style={{ color: stats.flaggedCount ? 'var(--red)' : 'var(--green)' }}>{stats.flaggedCount}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label"><MessageSquare size={11} style={{ marginRight: 4 }} />Comments</div>
            <div className="stat-value">{stats.totalComments}</div>
          </div>
        </div>
      )}

      {/* Top regions / categories */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Top regions</h3>
            {stats.byRegion.map(r => (
              <div key={r.region} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: 'var(--text2)' }}>
                <span style={{ textTransform: 'capitalize' }}>{r.region}</span><span>{r.count}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>By category</h3>
            {stats.byCategory.map(c => (
              <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: 'var(--text2)' }}>
                <span>{c.category}</span><span>{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk refresh */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Bulk refresh regions</h3>
        <form onSubmit={bulkRefresh} style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={refreshRegions} onChange={e => setRefreshRegions(e.target.value)}
            placeholder="mumbai, delhi, bangalore" />
          <button className="btn btn-primary" type="submit" disabled={refreshing}>
            {refreshing ? <div className="spinner" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>Comma-separated region list. Runs sequentially to stay under API rate limits.</p>
      </div>

      {/* Flagged articles */}
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} color="var(--amber)" /> Flagged articles ({flagged.length})
        </h3>
        {flagged.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>No flagged articles right now.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Title</th><th>Region</th><th>Reason</th><th></th></tr>
            </thead>
            <tbody>
              {flagged.map(a => (
                <tr key={a._id}>
                  <td style={{ maxWidth: 320 }}>{a.title}</td>
                  <td style={{ textTransform: 'capitalize' }}>{a.region}</td>
                  <td>{a.flagReason}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => unflag(a._id)} style={{ marginRight: 6 }}>Unflag</button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeArticle(a._id)}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
