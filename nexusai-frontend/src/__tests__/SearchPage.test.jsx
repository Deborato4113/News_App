import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() }) }));

import api from '../api/axios';
import SearchPage from '../pages/SearchPage';

const article = (n) => ({
  _id: `id${n}`, title: `Headline ${n}`, summary: 'Summary', source: { name: 'Wire' },
  category: 'Business', sentiment: 'neu', publishedAt: new Date().toISOString(), url: 'https://example.com',
});

describe('SearchPage', () => {
  beforeEach(() => localStorage.clear());

  it('searches, shows a result count, and remembers the query', async () => {
    api.get.mockResolvedValue({ data: { articles: [article(1), article(2)] } });
    const user = userEvent.setup();
    render(<SearchPage />);

    await user.type(screen.getByLabelText('Search news'), 'election');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(api.get).toHaveBeenCalledWith('/news/search', { params: { q: 'election', limit: 20 } });
    expect(await screen.findByText('Headline 1')).toBeTruthy();
    expect(screen.getByText(/results? for/).textContent).toContain('2');
    expect(JSON.parse(localStorage.getItem('nexusai_recent_searches'))).toEqual(['election']);
  });

  it('shows an empty state when nothing matches', async () => {
    api.get.mockResolvedValue({ data: { articles: [] } });
    const user = userEvent.setup();
    render(<SearchPage />);
    await user.type(screen.getByLabelText('Search news'), 'zzz');
    await user.keyboard('{Enter}');
    expect(await screen.findByText(/No results for/)).toBeTruthy();
  });

  it('does not search for blank input', async () => {
    render(<SearchPage />);
    const btn = screen.getByRole('button', { name: /search/i });
    expect(btn.disabled).toBe(true);
    expect(api.get).not.toHaveBeenCalled();
  });
});
