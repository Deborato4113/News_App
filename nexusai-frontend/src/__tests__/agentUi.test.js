import { describe, it, expect } from 'vitest';
import { applyEvent, buildHistory, isSafeUrl, argsPreview, seconds } from '../components/agent/agentUi';

describe('applyEvent', () => {
  it('adds a thinking row, then finishes it', () => {
    let p = applyEvent([], { type: 'model_start', round: 1 });
    expect(p).toEqual([{ kind: 'model', round: 1, done: false }]);
    p = applyEvent(p, { type: 'model_done', round: 1, ms: 900, tokens: 120, model: 'm' });
    expect(p[0]).toMatchObject({ done: true, ms: 900, tokens: 120 });
  });

  it('finishes the most recent running row for the same tool', () => {
    let p = applyEvent([], { type: 'tool_start', round: 1, tool: 'search_news' });
    p = applyEvent(p, { type: 'tool_start', round: 1, tool: 'search_news' });
    p = applyEvent(p, { type: 'tool_done', tool: 'search_news', step: { ok: true } });
    expect(p.map((r) => r.done)).toEqual([false, true]);
  });

  it('ignores unknown events and does not mutate its input', () => {
    const before = [{ kind: 'model', round: 1, done: false }];
    const after = applyEvent(before, { type: 'nope' });
    expect(after).toBe(before);
    applyEvent(before, { type: 'model_done', round: 1, ms: 1 });
    expect(before[0].done).toBe(false);
  });
});

describe('buildHistory', () => {
  it('keeps only finished turns, the last N, as user/assistant pairs', () => {
    const thread = [
      { status: 'done', question: 'q1', result: { answer: 'a1' } },
      { status: 'error', question: 'q2' },
      { status: 'done', question: 'q3', result: { answer: 'a3' } },
      { status: 'done', question: 'q4', result: { answer: 'a4' } },
    ];
    const h = buildHistory(thread, 2);
    expect(h).toEqual([
      { role: 'user', content: 'q3' }, { role: 'assistant', content: 'a3' },
      { role: 'user', content: 'q4' }, { role: 'assistant', content: 'a4' },
    ]);
  });
});

describe('helpers', () => {
  it('only allows http(s) links', () => {
    expect(isSafeUrl('https://a.com')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
  });
  it('formats args and durations', () => {
    expect(argsPreview({ region: 'delhi', limit: 5 })).toBe('region: delhi · limit: 5');
    expect(seconds(1250)).toBe('1.3s');
  });
});
