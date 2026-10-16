import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

describe('ConfirmDialog', () => {
  it('confirms and cancels, and Escape cancels', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDialog title="Delete?" message="Gone forever" confirmLabel="Delete" danger onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('puts focus on the safe action (Cancel)', () => {
    render(<ConfirmDialog title="t" message="m" onConfirm={() => {}} onCancel={() => {}} />);
    expect(document.activeElement.textContent).toBe('Cancel');
  });
});

describe('EmptyState', () => {
  it('renders the title, text and action', () => {
    render(<EmptyState title="Nothing here" action={<button>Go</button>}>Try again later</EmptyState>);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText('Try again later')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
  });
});
