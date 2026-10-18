import { useState, useEffect, useMemo } from 'react';
import { Bookmark, Search, X, Newspaper, FolderPlus, Trash2, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';
import ArticleSkeleton from '../components/ArticleSkeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import useLibrary from '../hooks/useLibrary';
import toast from 'react-hot-toast';

const NONE = [];

export default function SavedArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [region, setRegion]     = useState('all');

  // Collections: null = everything saved, otherwise one collection's id.
  const { collections, createCollection, deleteCollection } = useLibrary();
  const [activeCol, setActiveCol] = useState(null);
  const [colData, setColData]     = useState({ id: null, articles: [] });
  const [naming, setNaming]       = useState(false);
  const [newName, setNewName]     = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const active = collections.find((c) => c.id === activeCol) || null;
  const colLoading = !!active && colData.id !== active.id;

  useEffect(() => {
    if (!activeCol) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get(`/library/collections/${activeCol}/articles`);
        if (!cancelled) setColData({ id: activeCol, articles: r.data.articles });
      } catch {
        if (!cancelled) { toast.error('Could not load that collection.'); setActiveCol(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [activeCol, collections]);

  async function addCollection(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const c = await createCollection(newName.trim());
      setNewName(''); setNaming(false); setActiveCol(c.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create the collection.');
    }
  }

  async function removeCollection() {
    setConfirmDel(false);
    try {
      await deleteCollection(activeCol);
      setActiveCol(null);
      toast.success('Collection deleted. Your saved articles are untouched.');
    } catch {
      toast.error('Could not delete that collection.');
    }
  }

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

  const base = useMemo(
    () => (activeCol ? (colData.id === activeCol ? colData.articles : NONE) : articles),
    [activeCol, colData, articles]
  );

  const regions = useMemo(() => {
    const counts = {};
    base.forEach((a) => { if (a.region) counts[a.region] = (counts[a.region] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [base]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return base.filter((a) =>
      (region === 'all' || a.region === region) &&
      (!q || `${a.title} ${a.summary || ''}`.toLowerCase().includes(q))
    );
  }, [base, filter, region]);

  return (
    <div className="page">
      <PageHeader icon={Bookmark} title="Saved Articles" sub="Your reading list, kept across devices.">
        {!loading && articles.length > 0 && <span className="meta"><b>{articles.length}</b> saved</span>}
        <Link to="/history" className="btn btn-ghost btn-sm"><History size={14} /> Reading history</Link>
      </PageHeader>

      {!loading && (articles.length > 0 || collections.length > 0) && (
        <div className="chip-row" role="group" aria-label="Collections">
          <button className={`chip ${!active ? 'active' : ''}`} onClick={() => { setActiveCol(null); setRegion('all'); }}>
            All saved <span className="count">{articles.length}</span>
          </button>
          {collections.map((c) => (
            <button key={c.id} className={`chip ${activeCol === c.id ? 'active' : ''}`} onClick={() => { setActiveCol(c.id); setRegion('all'); }}>
              {c.name} <span className="count">{c.count}</span>
            </button>
          ))}
          {naming ? (
            <form onSubmit={addCollection} className="chip-form">
              <input className="input" autoFocus maxLength={40} placeholder="Collection name" aria-label="Collection name"
                value={newName} onChange={(e) => setNewName(e.target.value)} />
              <button className="btn btn-primary btn-sm" type="submit" disabled={!newName.trim()}>Add</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setNaming(false); setNewName(''); }} aria-label="Cancel"><X size={13} /></button>
            </form>
          ) : (
            <button className="chip chip-add" onClick={() => setNaming(true)}><FolderPlus size={13} /> New collection</button>
          )}
          {active && (
            <button className="chip chip-danger" onClick={() => setConfirmDel(true)} aria-label={`Delete collection ${active.name}`}>
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      )}

      {confirmDel && (
        <ConfirmDialog danger title={`Delete "${active?.name}"?`} confirmLabel="Delete"
          message="This removes the collection only. The articles stay in your saved list."
          onConfirm={removeCollection} onCancel={() => setConfirmDel(false)} />
      )}

      {loading || colLoading ? (
        <ArticleSkeleton count={3} />
      ) : active && colData.articles.length === 0 ? (
        <EmptyState icon={FolderPlus} title="This collection is empty">
          Open any article in the reader and use Collections to add it here.
        </EmptyState>
      ) : articles.length === 0 && !active ? (
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
            <div className="grid-list reveal-list" key={`${activeCol}|${region}|${filter}`}>
              {visible.map((a, i) => (
                <div key={a._id} style={{ '--i': i }}><ArticleCard article={a} onSaveChange={active ? undefined : handleSaveChange} siblings={visible} /></div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
