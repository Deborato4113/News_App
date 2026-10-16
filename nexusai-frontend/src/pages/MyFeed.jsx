import { useState, useEffect } from 'react';
import { Star, X, Plus, MapPin } from 'lucide-react';
import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';
import ArticleSkeleton from '../components/ArticleSkeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
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
  const [only, setOnly]         = useState('all');

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

  const SUGGESTED = ['mumbai', 'delhi', 'bangalore', 'london', 'singapore'].filter((r) => !followedRegions.includes(r));
  const shown = only === 'all' || !followedRegions.includes(only) ? articles : articles.filter((a) => a.region === only);

  async function quickFollow(region) {
    setFollowing(true);
    try {
      await followRegion(region);
      toast.success(`Following ${region}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not follow region.');
    }
    setFollowing(false);
  }

  return (
    <div className="page">
      <PageHeader icon={Star} title="My Feed" sub="Follow up to 6 regions and read their news merged into one feed.">
        <span className="meta"><b>{followedRegions.length}</b>/6 regions</span>
      </PageHeader>

      <div className="chip-row">
        {followedRegions.length > 0 && (
          <button className={`chip ${only === 'all' ? 'active' : ''}`} onClick={() => setOnly('all')}>All regions</button>
        )}
        {followedRegions.map((r) => (
          <span key={r} className={`chip region ${only === r ? 'active' : ''}`}>
            <button style={{ background: 'none', border: 'none', color: 'inherit', textTransform: 'capitalize' }} onClick={() => setOnly(r)}>{r}</button>
            <button className="chip-x" onClick={() => handleUnfollow(r)} aria-label={`Unfollow ${r}`} title={`Unfollow ${r}`}><X size={12} /></button>
          </span>
        ))}
      </div>

      {followedRegions.length < 6 && (
        <>
          <form onSubmit={handleFollow} className="toolbar">
            <div className="search-field">
              <MapPin size={15} />
              <input className="input" aria-label="Add a region" placeholder="Add a region, e.g. Mumbai, Delhi, London"
                value={input} onChange={e => setInput(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={following || !input.trim()}>
              {following ? <div className="spinner" /> : <Plus size={15} />} Follow
            </button>
          </form>
          {SUGGESTED.length > 0 && (
            <div className="chip-row">
              <span className="meta" style={{ alignSelf: 'center' }}>Suggested</span>
              {SUGGESTED.slice(0, 4).map((r) => (
                <button key={r} className="chip region" disabled={following} onClick={() => quickFollow(r)}><Plus size={12} /> {r}</button>
              ))}
            </div>
          )}
        </>
      )}

      {loading ? (
        <ArticleSkeleton count={4} />
      ) : followedRegions.length === 0 ? (
        <EmptyState icon={Star} title="Follow a region to get started">
          Pick one or more regions above and their latest stories will be merged here, newest first.
        </EmptyState>
      ) : articles.length === 0 ? (
        <EmptyState icon={MapPin} title="Nothing cached yet">
          Open the Dashboard and search each followed region once to populate this feed.
        </EmptyState>
      ) : (
        <>
          <p className="meta" style={{ marginBottom: 10 }}><b>{shown.length}</b> stories{only !== 'all' && followedRegions.includes(only) ? ` from ${only}` : ''}</p>
          <div className="grid-list reveal-list" key={only}>
            {shown.map((a, i) => <div key={a._id || i} style={{ '--i': i }}><ArticleCard article={a} siblings={shown} /></div>)}
          </div>
        </>
      )}
    </div>
  );
}
