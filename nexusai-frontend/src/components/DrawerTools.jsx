import { useEffect, useRef, useState } from 'react';
import { Volume2, Square, Share2, FolderPlus, Check, StickyNote, Plus, Languages, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useSpeech from '../hooks/useSpeech';
import useLibrary from '../hooks/useLibrary';
import api from '../api/axios';
import { LANGUAGES, browserLanguage, filterLanguages } from '../lib/languages';

// The last language the reader picked, so it is one click next time.
const LAST_KEY = 'nexusai-lang';
function lastLanguage() {
  try { return LANGUAGES.find((l) => l.name === localStorage.getItem(LAST_KEY)) || null; } catch { return null; }
}
function rememberLanguage(name) {
  try { localStorage.setItem(LAST_KEY, name); } catch { /* storage unavailable: fine */ }
}

// Translate the summary into any of the supported languages. `value` is
// { lang, native, tag, cloud, rtl, text } or null.
export function TranslateMenu({ article, value, onChange, variant = 'drawer' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef(null);
  const searchRef = useRef(null);

  // Close on Escape or a click outside.
  useEffect(() => {
    if (!open) return undefined;
    searchRef.current?.focus(); // the search box is the reason the menu was opened
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  async function pick(l) {
    setOpen(false);
    setQuery('');
    setBusy(true);
    try {
      const r = await api.post('/ai/translate', { text: article.summary || article.description || article.title, targetLang: l.name });
      rememberLanguage(l.name);
      onChange({ lang: l.name, native: l.native, tag: l.tag, cloud: l.cloud, rtl: !!l.rtl, text: r.data.translated });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Translation failed.');
    }
    setBusy(false);
  }

  // Suggestions first: the reader's browser language and their last pick.
  const matches = filterLanguages(query);
  const suggested = query ? [] : [browserLanguage(), lastLanguage()].filter((l, i, a) => l && a.findIndex((x) => x?.name === l.name) === i);
  const rest = matches.filter((l) => !suggested.some((s) => s.name === l.name));

  const item = (l) => (
    <button key={l.name} type="button" className="menu-item lang-item" onClick={() => pick(l)}>
      <span>{l.name}</span>
      <span className="lang-native" lang={l.tag} dir={l.rtl ? 'rtl' : undefined}>{l.native}</span>
    </button>
  );

  return (
    <div className="collect" ref={box}>
      <button type="button" className={variant === 'card' ? `act${value ? ' on-green' : ''}` : `btn btn-ghost btn-sm${value ? ' on' : ''}`} aria-expanded={open} aria-haspopup="listbox" disabled={busy} onClick={() => setOpen((o) => !o)}>
        {busy ? <Loader2 size={14} className="spin" /> : <Languages size={14} />} {value ? value.lang : 'Translate'}
      </button>
      {open && (
        <div className={`collect-pop lang-pop${variant === 'card' ? ' lang-pop-up' : ''}`}>
          <input
            className="lang-search"
            type="search"
            placeholder="Search 70+ languages"
            aria-label="Search languages"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            ref={searchRef}
          />
          <div className="lang-list" role="listbox" aria-label="Languages">
            {value && !query && <button type="button" className="menu-item" onClick={() => { onChange(null); setOpen(false); }}>Show original (English)</button>}
            {suggested.length > 0 && <p className="menu-head">Suggested</p>}
            {suggested.map(item)}
            {suggested.length > 0 && rest.length > 0 && <p className="menu-head">All languages</p>}
            {rest.map(item)}
            {matches.length === 0 && <p className="menu-head">No language matches “{query}”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Listen + Share buttons for the reader drawer. When a translation is showing,
// Listen reads that translation in its own language.
export function ListenShare({ article, translated, showShare = true }) {
  const { speaking, stop, hasVoice, speakBrowser, speakServer } = useSpeech();
  const { title, summary, description, url } = article;

  async function listen() {
    if (speaking) { stop(); return; }
    if (!translated) {
      speakBrowser(`${title}. ${summary || description || ''}`);
      return;
    }
    // Translations use the server voice so they work on any device; if Google has
    // no voice for the language or the server voice is unavailable, fall back to a
    // voice installed on this device.
    if (translated.cloud && await speakServer(translated.text, translated.cloud)) return;
    if (hasVoice(translated.tag) && speakBrowser(translated.text, translated.tag)) return;
    toast.error(translated.cloud
      ? `Could not play ${translated.lang} audio right now. Please try again in a moment.`
      : `Audio is not available for ${translated.lang} on this device yet. You can still read the translation.`);
  }

  async function share() {
    const link = url || window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, text: title, url: link }); } catch { /* the reader closed the share sheet */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link.');
    }
  }

  return (
    <div className="ph-actions" style={{ flexWrap: 'wrap' }}>
      <button type="button" className={`btn btn-ghost btn-sm${speaking ? ' on' : ''}`} aria-pressed={speaking} onClick={listen}>
        {speaking ? <Square size={13} /> : <Volume2 size={14} />} {speaking ? 'Stop' : 'Listen'}
      </button>
      {showShare && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={share}>
          <Share2 size={14} /> Share
        </button>
      )}
    </div>
  );
}

// Add the article to one or more collections, or start a new one.
export function CollectionPicker({ articleId }) {
  const { collections, createCollection, toggleInCollection } = useLibrary();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function toggle(c) {
    const inside = c.articleIds.includes(articleId);
    try { await toggleInCollection(c.id, articleId, inside); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not update the collection.'); }
  }

  async function create(e) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const c = await createCollection(name.trim());
      await toggleInCollection(c.id, articleId, false);
      setName('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create the collection.');
    }
    setBusy(false);
  }

  const count = collections.filter((c) => c.articleIds.includes(articleId)).length;

  return (
    <div className="collect">
      <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <FolderPlus size={14} /> Collections{count > 0 && <span className="count-pill">{count}</span>}
      </button>
      {open && (
        <div className="collect-pop">
          {collections.length === 0 && <p className="meta" style={{ padding: '6px 8px' }}>No collections yet. Name your first one below.</p>}
          {collections.map((c) => {
            const inside = c.articleIds.includes(articleId);
            return (
              <button key={c.id} type="button" className="menu-item" role="checkbox" aria-checked={inside} onClick={() => toggle(c)}>
                <span className={`tick${inside ? ' on' : ''}`}>{inside && <Check size={11} />}</span>
                {c.name} <span className="meta" style={{ marginLeft: 'auto' }}>{c.count}</span>
              </button>
            );
          })}
          <form onSubmit={create} className="collect-new">
            <input className="input" placeholder="New collection…" aria-label="New collection name" maxLength={40}
              value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!name.trim() || busy} aria-label="Create collection"><Plus size={14} /></button>
          </form>
        </div>
      )}
    </div>
  );
}

// A private note on the article, saved to the server.
export function NoteBox({ articleId }) {
  const { notes, saveNote, deleteNote } = useLibrary();
  const saved = notes[articleId] || '';
  const [draft, setDraft] = useState(null); // null = untouched, show the saved text
  const text = draft ?? saved;
  const dirty = draft !== null && draft.trim() !== saved;

  async function save() {
    try {
      if (!text.trim()) await deleteNote(articleId);
      else await saveNote(articleId, text.trim());
      setDraft(null);
      toast.success(text.trim() ? 'Note saved' : 'Note removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the note.');
    }
  }

  return (
    <div className="notebox">
      <label className="label" htmlFor={`note-${articleId}`}><StickyNote size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />Your private note</label>
      <textarea id={`note-${articleId}`} className="input" rows={3} maxLength={500} placeholder="Why does this matter? Only you can see this."
        value={text} onChange={(e) => setDraft(e.target.value)} />
      <div className="notebox-foot">
        <span className="meta">{text.length}/500</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={save} disabled={!dirty}>Save note</button>
      </div>
    </div>
  );
}
