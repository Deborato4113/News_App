import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function MyFeed() {
  const { user, followRegion, unfollowRegion } = useAuth();
  const followedRegions = user?.followedRegions || [];
  const followedKey = followedRegions.join(',');

  const [input, setInput]       = useState('');
  const [following, setFollowing] = useState(false);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(false);

  // Fetches cached articles for every followed region in parallel and
  // merges them into one feed sorted by recency. Reuses the existing
  // GET /api/news endpoint per-region rather than adding a new backend
  // route just for merging — the merge itself is cheap client-side work.
  // Re-runs whenever the followed-region list actually changes (compared
  // by value via `followedKey`, not by array reference). The empty-regions
  // case is handled inside the async callback too, so no setState call
  // happens synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const regions = followedKey ? followedKey.split(',') : [];
      if (!regions.length) {
        if (!cancelled) setArticles([]);
        return;
      }
      setLoading(true);
      try {
        const results = await Promise.all(
          regions.map((region) =>
            api.get('/news', { params: { region, limit: 8 } }).then((r) => r.data.articles).catch(() => [])
          )
        );
        if (cancelled) return;
        const merged = results.flat().sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        setArticles(merged);
      } catch {
        if (!cancelled) toast.error('Could not load your feed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [followedKey]);

  async function handleFollow(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setFollowing(true);
    try {
      await followRegion(input.trim());
      setInput('');
      toast.success(`Following ${input.trim()}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not follow region.');
    }
    setFollowing(false);
  }

  async function handleUnfollow(region) {
    try {
      await unfollowRegion(region);
    } catch {
      toast.error('Could not unfollow region.');
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Star size={22} color="var(--green)" />
        <h1 className="display" style={{ fontSize: 26 }}>My Feed</h1>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1.25rem' }}>
        Follow up to 6 regions and see their news merged into one feed.
      </p>

      {/* Followed region chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
        {followedRegions.map((r) => (
          <span key={r} className="badge badge-general" style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize', padding: '5px 10px' }}>
            {r}
            <button onClick={() => handleUnfollow(r)} title={`Unfollow ${r}`}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}>
              <X size={12} />
            </button>
          </span>
        ))}
        {followedRegions.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>You're not following any regions yet.</span>
        )}
      </div>

      {/* Add region */}
      {followedRegions.length < 6 && (
        <form onSubmit={handleFollow} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
          <input className="input" placeholder="Add a region — e.g. Mumbai, Delhi, London"
            value={input} onChange={e => setInput(e.target.value)} />
          <button className="btn btn-primary btn-sm" type="submit" disabled={following || !input.trim()}>
            {following ? <div className="spinner" /> : 'Follow'}
          </button>
        </form>
      )}

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text2)' }}>
          <div className="spinner-lg" style={{ margin: '0 auto 1rem' }} />
          Loading your feed…
        </div>
      ) : followedRegions.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">⭐</div>
          <div className="empty-title">Follow a region to get started</div>
          <p style={{ fontSize: 14, marginTop: 6 }}>Add one or more regions above to see their news here.</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📰</div>
          <div className="empty-title">Nothing cached yet</div>
          <p style={{ fontSize: 14, marginTop: 6 }}>Visit the Dashboard and search each followed region once to populate this feed.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {articles.map((a, i) => <ArticleCard key={a._id || i} article={a} />)}
        </div>
      )}
    </div>
  );
}
