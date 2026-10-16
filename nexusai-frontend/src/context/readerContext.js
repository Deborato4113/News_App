import { createContext } from 'react';

// Default is a no-op so a card rendered outside the provider (tests, previews) still works.
export const ReaderContext = createContext({ open: () => {} });
