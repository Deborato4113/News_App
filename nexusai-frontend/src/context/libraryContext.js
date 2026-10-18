import { createContext } from 'react';

// The no-op default means a card rendered outside the provider (tests,
// previews) still works: nothing is dimmed, no collections, notes are empty.
export const LibraryContext = createContext({
  ready: false,
  readIds: new Set(),
  collections: [],
  notes: {},
  markRead: () => {},
  createCollection: async () => null,
  deleteCollection: async () => {},
  renameCollection: async () => {},
  toggleInCollection: async () => {},
  saveNote: async () => {},
  deleteNote: async () => {},
});
