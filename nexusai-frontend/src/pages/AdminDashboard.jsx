import { useState, useEffect } from 'react';
import { ShieldCheck, Flag, Trash2, RefreshCw, Users, Newspaper, MessageSquare, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import useCountUp from '../hooks/useCountUp';

export default function AdminDashboard() {
  const [stats, setStats]           = useState(null);
  const [flagged, setFlagged]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshRegions, setRefreshRegions] = useState('mumbai, delhi, bangalore');
  const [refreshing, setRefreshing] = useState(false);
  const [toDelete, setToDelete]     = useState(null);

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
    setToDelete(null);
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
      <div className="page" aria-busy="true">
        <PageHeader icon={ShieldCheck} title="Admin Dashboard" sub="Loading platform data…" />
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton" style={{ height: 82, borderRadius: 14 }} />)}
        </div>
        <div className="two-col">
          <div className="skeleton" style={{ height: 180, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 180, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader icon={ShieldCheck} title="Admin Dashboard" sub="Platform health, content moderation and cache refresh." />

      {stats && (
        <div className="stat-grid reveal-list" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <Tile i={0} icon={<Users size={12} />} label="Users" value={stats.totalUsers} />
          <Tile i={1} icon={<Newspaper size={12} />} label="Articles" value={stats.totalArticles} />
          <Tile i={2} icon={<Clock size={12} />} label="Last 24h" value={stats.articlesLast24h} />
          <Tile i={3} icon={<Flag size={12} />} label="Flagged" value={stats.flaggedCount} color={stats.flaggedCount ? 'var(--red)' : 'var(--green)'} />
          <Tile i={4} icon={<MessageSquare size={12} />} label="Comments" value={stats.totalComments} />
        </div>
      )}

      {stats && (
        <div className="two-col">
          <div className="card">
            <h3 className="card-title">Top regions</h3>
            <Bars rows={stats.byRegion.map((r) => ({ name: r.region, n: r.count }))} />
          </div>
          <div className="card">
            <h3 className="card-title">By category</h3>
            <Bars rows={stats.byCategory.map((c) => ({ name: c.category, n: c.count }))} />
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="card-title"><RefreshCw size={14} color="var(--green)" /> Bulk refresh regions</h3>
        <form onSubmit={bulkRefresh} className="toolbar" style={{ marginBottom: 0 }}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} aria-label="Regions to refresh" value={refreshRegions}
            onChange={e => setRefreshRegions(e.target.value)} placeholder="mumbai, delhi, bangalore" />
          <button className="btn btn-primary" type="submit" disabled={refreshing}>
            {refreshing ? <div className="spinner" /> : <RefreshCw size={14} />} Refresh
          </button>
        </form>
        <p className="meta" style={{ marginTop: 10 }}>Comma-separated. Runs one region at a time to stay under API rate limits.</p>
      </div>

      <div className="card">
        <h3 className="card-title"><AlertTriangle size={14} color="var(--amber)" /> Flagged articles ({flagged.length})</h3>
        {flagged.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All clear">No flagged articles right now.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Title</th><th>Region</th><th>Reason</th><th></th></tr></thead>
              <tbody>
                {flagged.map(a => (
                  <tr key={a._id}>
                    <td style={{ maxWidth: 320 }}>{a.title}</td>
                    <td style={{ textTransform: 'capitalize' }}>{a.region}</td>
                    <td>{a.flagReason}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => unflag(a._id)}>Unflag</button>
                        <button className="btn btn-danger btn-sm" aria-label="Delete article" onClick={() => setToDelete(a)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toDelete && (
        <ConfirmDialog danger title="Delete this article?" confirmLabel="Delete"
          message={`“${toDelete.title}” will be removed permanently. This cannot be undone.`}
          onCancel={() => setToDelete(null)} onConfirm={() => removeArticle(toDelete._id)} />
      )}
    </div>
  );
}

function Tile({ icon, label, value, color, i }) {
  const n = useCountUp(value);
  return (
    <div className="stat-tile" style={{ '--i': i }}>
      <div className="stat-label">{icon}{label}</div>
      <div className="stat-value" style={color ? { color } : undefined}>{n}</div>
    </div>
  );
}

function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <p className="meta">No data yet.</p>;
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.name}>
          <span>{r.name}</span>
          <div className="bar-track"><i style={{ '--w': `${(r.n / max) * 100}%` }} /></div>
          <span>{r.n}</span>
        </div>
      ))}
    </div>
  );
}
