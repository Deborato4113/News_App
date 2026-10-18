import { describe, it, expect } from 'vitest';
import { readSeconds, formatRead, topWords, sentimentMix, titleCase } from '../lib/text';

describe('read time', () => {
  it('estimates seconds at ~220 words per minute', () => {
    expect(readSeconds('word '.repeat(220))).toBe(60);
    expect(readSeconds('')).toBe(0);
  });
  it('formats short and long reads', () => {
    expect(formatRead(0)).toBe('5 sec read');
    expect(formatRead(30)).toBe('30 sec read');
    expect(formatRead(60)).toBe('1 min read');
    expect(formatRead(200)).toBe('3 min read');
  });
});

describe('topWords', () => {
  const a = (title) => ({ title });
  it('counts a word once per headline and needs two headlines', () => {
    const list = [a('Monsoon floods hit city'), a('Monsoon monsoon delays trains'), a('Cricket final tonight')];
    expect(topWords(list)).toEqual([{ word: 'monsoon', count: 2 }]);
  });
  it('skips stop words and numbers', () => {
    const list = [a('The 2026 budget says'), a('The 2026 budget today')];
    expect(topWords(list)).toEqual([{ word: 'budget', count: 2 }]);
  });
});

describe('sentimentMix', () => {
  it('computes percentages', () => {
    const m = sentimentMix([{ sentiment: 'pos' }, { sentiment: 'pos' }, { sentiment: 'neg' }, { sentiment: 'neu' }]);
    expect(m).toMatchObject({ total: 4, pos: 2, neg: 1, neu: 1, posPct: 50, negPct: 25, neuPct: 25 });
  });
  it('handles an empty list', () => {
    expect(sentimentMix([]).posPct).toBe(0);
  });
});

it('titleCase', () => {
  expect(titleCase('new york')).toBe('New York');
});
