import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest globals are off, so Testing Library can't register its own cleanup.
afterEach(() => cleanup());
