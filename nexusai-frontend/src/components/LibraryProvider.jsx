import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { LibraryContext } from '../context/libraryContext';

const EMPTY = { userId: null, readIds: [], collections: [], notes: {} };

// Everything personal to the reader that several screens share: which articles
// they have read, their collections and their notes. Loaded once after sign-in.
export default function LibraryProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [data, setData] = useState(EMPTY);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [ids, cols, notes] = await Promise.all([
          api.get('/news/read-ids'),
          api.get('/library/collections'),
          api.get('/library/notes'),
        ]);
        if (cancelled) return;
        setData({
          userId,
          readIds: ids.data.ids,
          collections: cols.data.collections,
          notes: Object.fromEntries(notes.data.notes.map((n) => [n.articleId, n.text])),
        });
      } catch {
        // The library is a nice-to-have: if it fails, the rest of the app still works.
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Data from a previous account is never shown to the next one.
  const mine = useMemo(() => (data.userId === userId ? data : { ...EMPTY, userId }), [data, userId]);
  const patch = useCallback((fn) => setData((d) => fn(d.userId === userId ? d : { ...EMPTY, userId })), [userId]);

  const markRead = useCallback((articleId) => {
    if (!articleId) return;
    patch((d) => (d.readIds.includes(articleId) ? d : { ...d, readIds: [articleId, ...d.readIds] }));
    api.post(`/news/${articleId}/read`).catch(() => {});
  }, [patch]);

  const createCollection = useCallback(async (name) => {
    const r = await api.post('/library/collections', { name });
    patch((d) => ({ ...d, collections: [r.data.collection, ...d.collections] }));
    return r.data.collection;
  }, [patch]);

  const renameCollection = useCallback(async (id, name) => {
    const r = await api.patch(`/library/collections/${id}`, { name });
    patch((d) => ({ ...d, collections: d.collections.map((c) => (c.id === id ? r.data.collection : c)) }));
  }, [patch]);

  const deleteCollection = useCallback(async (id) => {
    await api.delete(`/library/collections/${id}`);
    patch((d) => ({ ...d, collections: d.collections.filter((c) => c.id !== id) }));
  }, [patch]);

  const toggleInCollection = useCallback(async (collectionId, articleId, inside) => {
    const r = inside
      ? await api.delete(`/library/collections/${collectionId}/articles/${articleId}`)
      : await api.post(`/library/collections/${collectionId}/articles/${articleId}`);
    patch((d) => ({ ...d, collections: d.collections.map((c) => (c.id === collectionId ? r.data.collection : c)) }));
  }, [patch]);

  const saveNote = useCallback(async (articleId, text) => {
    await api.put(`/library/notes/${articleId}`, { text });
    patch((d) => ({ ...d, notes: { ...d.notes, [articleId]: text } }));
  }, [patch]);

  const deleteNote = useCallback(async (articleId) => {
    await api.delete(`/library/notes/${articleId}`);
    patch((d) => {
      const notes = { ...d.notes };
      delete notes[articleId];
      return { ...d, notes };
    });
  }, [patch]);

  const value = useMemo(() => ({
    ready: userId !== null && data.userId === userId,
    readIds: new Set(mine.readIds),
    collections: mine.collections,
    notes: mine.notes,
    markRead, createCollection, renameCollection, deleteCollection, toggleInCollection, saveNote, deleteNote,
  }), [mine, data.userId, userId, markRead, createCollection, renameCollection, deleteCollection, toggleInCollection, saveNote, deleteNote]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
