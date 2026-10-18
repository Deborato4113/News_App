import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import toast from 'react-hot-toast';
import api from '../api/axios';
import { LibraryContext } from '../context/libraryContext';
import { TranslateMenu, ListenShare, CollectionPicker, NoteBox } from '../components/DrawerTools';
import MoodPanel from '../components/MoodPanel';
import { MemoryRouter } from 'react-router-dom';

const article = { _id: 'a1', title: 'Big story', summary: 'It happened.', url: 'https://example.com/x' };

function lib(over = {}) {
  return {
    readIds: new Set(), collections: [], notes: {},
    markRead: vi.fn(), createCollection: vi.fn(), deleteCollection: vi.fn(), renameCollection: vi.fn(),
    toggleInCollection: vi.fn().mockResolvedValue(), saveNote: vi.fn().mockResolvedValue(), deleteNote: vi.fn().mockResolvedValue(),
    ...over,
  };
}
const withLib = (ui, value) => <LibraryContext.Provider value={value}>{ui}</LibraryContext.Provider>;

describe('ListenShare', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: vi.fn(), cancel: vi.fn() }, configurable: true });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    delete navigator.share;
  });

  it('speaks the title and summary, then stops', async () => {
    const user = userEvent.setup();
    render(<ListenShare article={article} />);
    await user.click(screen.getByRole('button', { name: /listen/i }));
    expect(window.speechSynthesis.speak.mock.calls[0][0].text).toBe('Big story. It happened.');
    await user.click(screen.getByRole('button', { name: /stop/i }));
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('uses the share sheet when available, else copies the link', async () => {
    const user = userEvent.setup();
    navigator.share = vi.fn().mockResolvedValue();
    const { unmount } = render(<ListenShare article={article} />);
    await user.click(screen.getByRole('button', { name: /share/i }));
    expect(navigator.share).toHaveBeenCalledWith({ title: 'Big story', text: 'Big story', url: article.url });
    unmount();

    delete navigator.share;
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ListenShare article={article} />);
    await user.click(screen.getByRole('button', { name: /share/i }));
    expect(writeText).toHaveBeenCalledWith(article.url);
    expect(toast.success).toHaveBeenCalledWith('Link copied');
  });
});

describe('Listen after translation', () => {
  const hindi = { lang: 'Hindi', tag: 'hi-IN', cloud: 'hi-IN', text: 'नमस्ते' };

  beforeEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [{ lang: 'hi-IN' }] }, configurable: true,
    });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    window.Audio = vi.fn(function (src) { this.src = src; this.play = vi.fn().mockResolvedValue(); this.pause = vi.fn(); });
  });

  it('plays the server voice in the translated language', async () => {
    api.post.mockResolvedValue({ data: { audio: 'QUJD' } });
    const user = userEvent.setup();
    render(<ListenShare article={article} translated={hindi} />);
    await user.click(screen.getByRole('button', { name: /listen/i }));
    expect(api.post).toHaveBeenCalledWith('/ai/speak', { text: 'नमस्ते', lang: 'hi-IN' });
    expect(window.Audio).toHaveBeenCalledWith('data:audio/mpeg;base64,QUJD');
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('falls back to a device voice when the server voice is unavailable', async () => {
    api.post.mockRejectedValue(new Error('503'));
    const user = userEvent.setup();
    render(<ListenShare article={article} translated={hindi} />);
    await user.click(screen.getByRole('button', { name: /listen/i }));
    const u = window.speechSynthesis.speak.mock.calls[0][0];
    expect(u.text).toBe('नमस्ते');
    expect(u.lang).toBe('hi-IN');
  });

  it('says so when neither voice is available', async () => {
    api.post.mockRejectedValue(new Error('503'));
    const user = userEvent.setup();
    render(<ListenShare article={article} translated={{ lang: 'Tamil', tag: 'ta-IN', cloud: 'ta-IN', text: 'வணக்கம்' }} />);
    await user.click(screen.getByRole('button', { name: /listen/i }));
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Tamil'));
  });
});

describe('CollectionPicker', () => {
  it('ticks collections the article is in and toggles on click', async () => {
    const user = userEvent.setup();
    const value = lib({ collections: [{ id: 'c1', name: 'Exam prep', count: 1, articleIds: ['a1'] }, { id: 'c2', name: 'Later', count: 0, articleIds: [] }] });
    render(withLib(<CollectionPicker articleId="a1" />, value));
    await user.click(screen.getByRole('button', { name: /collections/i }));
    expect(screen.getByRole('checkbox', { name: /exam prep/i }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: /later/i }).getAttribute('aria-checked')).toBe('false');

    await user.click(screen.getByRole('checkbox', { name: /later/i }));
    expect(value.toggleInCollection).toHaveBeenCalledWith('c2', 'a1', false);
    await user.click(screen.getByRole('checkbox', { name: /exam prep/i }));
    expect(value.toggleInCollection).toHaveBeenCalledWith('c1', 'a1', true);
  });
});

describe('NoteBox', () => {
  it('saves only after the text changes, and removes an emptied note', async () => {
    const user = userEvent.setup();
    const value = lib({ notes: { a1: 'old note' } });
    render(withLib(<NoteBox articleId="a1" />, value));
    const save = screen.getByRole('button', { name: /save note/i });
    expect(save.disabled).toBe(true);

    const box = screen.getByLabelText(/private note/i);
    expect(box.value).toBe('old note');
    await user.clear(box);
    await user.type(box, 'new note');
    await user.click(save);
    expect(value.saveNote).toHaveBeenCalledWith('a1', 'new note');

    await user.clear(box);
    await user.click(screen.getByRole('button', { name: /save note/i }));
    expect(value.deleteNote).toHaveBeenCalledWith('a1');
  });
});

describe('MoodPanel', () => {
  const mk = (title, sentiment) => ({ title, sentiment });
  it('shows the mix and links frequent words to search', () => {
    const list = [mk('Monsoon hits Kolkata', 'neg'), mk('Monsoon delays trains', 'neg'), mk('Cricket win', 'pos'), mk('Markets steady', 'neu')];
    render(<MemoryRouter><MoodPanel articles={list} region="Kolkata" /></MemoryRouter>);
    expect(screen.getByRole('img', { name: /25% positive, 25% neutral, 50% negative/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /monsoon/i }).getAttribute('href')).toBe('/search?q=monsoon');
  });
  it('stays hidden with too few stories', () => {
    const { container } = render(<MemoryRouter><MoodPanel articles={[mk('One', 'pos')]} region="X" /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });
});

describe('TranslateMenu', () => {
  it('searches the language list and translates into the chosen language', async () => {
    api.post.mockResolvedValue({ data: { translated: 'Habari' } });
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TranslateMenu article={article} value={null} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /translate/i }));
    await user.type(screen.getByRole('searchbox', { name: /search languages/i }), 'swah');
    expect(screen.queryByText('Hindi')).toBeNull();
    await user.click(screen.getByRole('button', { name: /swahili/i }));
    expect(api.post).toHaveBeenCalledWith('/ai/translate', expect.objectContaining({ targetLang: 'Swahili' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ lang: 'Swahili', cloud: null, text: 'Habari' }));
  });

  it('says when nothing matches and closes on Escape', async () => {
    const user = userEvent.setup();
    render(<TranslateMenu article={article} value={null} onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: /translate/i }));
    await user.type(screen.getByRole('searchbox', { name: /search languages/i }), 'klingon');
    expect(screen.getByText(/no language matches/i)).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});

describe('Listen in a language without a server voice', () => {
  it('skips the server and uses a device voice', async () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [{ lang: 'sw-KE' }] }, configurable: true,
    });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    api.post.mockClear();
    const user = userEvent.setup();
    render(<ListenShare article={article} translated={{ lang: 'Swahili', tag: 'sw', cloud: null, text: 'Habari' }} />);
    await user.click(screen.getByRole('button', { name: /listen/i }));
    expect(api.post).not.toHaveBeenCalled();
    expect(window.speechSynthesis.speak.mock.calls[0][0].lang).toBe('sw');
  });

  it('explains when the device has no voice either', async () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [{ lang: 'en-US' }] }, configurable: true,
    });
    const user = userEvent.setup();
    render(<ListenShare article={article} translated={{ lang: 'Amharic', tag: 'am', cloud: null, text: 'ሰላም' }} />);
    await user.click(screen.getByRole('button', { name: /listen/i }));
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Amharic'));
  });
});
