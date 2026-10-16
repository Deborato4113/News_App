import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), dismiss: vi.fn() }) }));

import api from '../api/axios';
import ArticleCard from '../components/ArticleCard';

const base = {
  _id: 'a1', title: 'City council approves budget', summary: 'A short summary.', source: { name: 'Wire' },
  category: 'Politics', sentiment: 'pos', publishedAt: new Date().toISOString(), url: 'https://example.com/a1',
};

describe('ArticleCard', () => {
  it('renders the headline as a link to the source', () => {
    render(<ArticleCard article={base} />);
    const link = screen.getByRole('link', { name: base.title });
    expect(link.getAttribute('href')).toBe(base.url);
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('toggles save with the server response and tells the parent', async () => {
    api.post.mockResolvedValue({ data: { saved: true, saveCount: 1 } });
    const onSaveChange = vi.fn();
    const user = userEvent.setup();
    render(<ArticleCard article={base} onSaveChange={onSaveChange} />);

    await user.click(screen.getByRole('button', { name: 'Save article' }));
    await waitFor(() => expect(onSaveChange).toHaveBeenCalledWith('a1', true, base));
    expect(api.post).toHaveBeenCalledWith('/news/a1/save');
    expect(screen.getByRole('button', { name: 'Remove from saved' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps its state when the request fails', async () => {
    api.post.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    render(<ArticleCard article={base} />);
    await user.click(screen.getByRole('button', { name: 'Like' }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Like' }).getAttribute('aria-pressed')).toBe('false');
  });
});
