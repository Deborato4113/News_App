import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import AnswerCard from '../components/agent/AnswerCard';

const turn = {
  result: {
    answer: 'Mumbai had **heavy rain** today.',
    sources: [
      { title: 'Rain hits Mumbai', url: 'https://example.com/rain' },
      { title: 'Bad link', url: 'javascript:alert(1)' },
    ],
    steps: [{ tool: 'search_news', ok: true, ms: 120, round: 1, args: { query: 'rain' }, summary: 'Found 3 articles' }],
    followUps: ['And Delhi?'],
    pendingActions: [],
    meta: { rounds: 2, durationMs: 2100, stoppedReason: 'answered', trace: [{ round: 1, ms: 900, tokens: 100 }], totalTokens: 100 },
  },
};

describe('AnswerCard', () => {
  it('renders the answer with bold, and only safe numbered sources', () => {
    render(<AnswerCard turn={turn} onFollowUp={() => {}} />);
    expect(screen.getByText('heavy rain').tagName).toBe('STRONG');
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://example.com/rain');
    expect(links[0].textContent).toContain('1');
  });

  it('shows the steps taken and sends a follow-up', async () => {
    const onFollowUp = vi.fn();
    const user = userEvent.setup();
    render(<AnswerCard turn={turn} onFollowUp={onFollowUp} />);
    expect(screen.getByText(/Steps taken \(1 tool call/)).toBeTruthy();
    expect(screen.getByText('→ Found 3 articles')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'And Delhi?' }));
    expect(onFollowUp).toHaveBeenCalledWith('And Delhi?');
  });
});
