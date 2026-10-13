// Tests for the evaluation harness itself (grading logic, report, case list).
// The real evaluation (`npm run eval`) calls the live AI; this does not.
const { CASES } = require('../../evaluation/cases');
const { scoreCase, scoreError, summarize, runCases, toMarkdown } = require('../../evaluation/scoring');
const { createTools } = require('../../services/agentTools');
const { makeDeps } = require('../helpers/agentFakes');

const result = (over = {}) => ({
  steps: [], sources: [], stoppedReason: 'answered', durationMs: 2000, totalTokens: 1000, droppedSources: 0, models: ['m'], ...over,
});
const step = (tool, summary = 'ok', ok = true) => ({ tool, ok, summary });

describe('the fixed question set', () => {
  it('has 20 questions with unique ids', () => {
    expect(CASES).toHaveLength(20);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(20);
  });

  it('only expects tools that really exist', () => {
    const names = createTools({ userId: 'u', deps: makeDeps().deps }).names();
    for (const c of CASES) {
      for (const t of [...(c.expectTools || []), ...(c.forbidTools || [])]) expect(names).toContain(t);
    }
  });

  it('gives every question a clear expectation and a sensible length', () => {
    for (const c of CASES) {
      expect(Boolean(c.expectTools?.length) || c.expectNoTools === true).toBe(true);
      expect(c.question.length).toBeGreaterThanOrEqual(5);   // passes the API's own validation
      expect(c.question.length).toBeLessThanOrEqual(500);
    }
  });

  it('covers every tool at least once', () => {
    const covered = new Set(CASES.flatMap((c) => c.expectTools || []));
    const names = createTools({ userId: 'u', deps: makeDeps().deps }).names();
    for (const n of names.filter((x) => x !== 'get_article')) expect(covered).toContain(n); // get_article is optional follow-up
  });
});

describe('scoreCase', () => {
  const search = { id: 't', category: 'news', question: 'q', expectTools: ['search_news'], mustCite: true };

  it('passes when the right tool was used and the agent answered', () => {
    const row = scoreCase(search, result({ steps: [step('search_news', '3 article(s) found')], sources: [{ title: 'a', url: 'https://x.com' }] }));
    expect(row).toMatchObject({ toolsOk: true, answered: true, pass: true, citationApplicable: true, cited: true });
  });

  it('fails when an expected tool was not used', () => {
    expect(scoreCase(search, result({ steps: [step('get_quiz_history')] })).toolsOk).toBe(false);
  });

  it('needs ALL expected tools when several are expected', () => {
    const multi = { ...search, expectTools: ['search_news', 'get_quiz_history'] };
    expect(scoreCase(multi, result({ steps: [step('search_news')] })).toolsOk).toBe(false);
    expect(scoreCase(multi, result({ steps: [step('search_news'), step('get_quiz_history')] })).toolsOk).toBe(true);
  });

  it('fails when a forbidden tool was used', () => {
    expect(scoreCase({ ...search, forbidTools: ['generate_quiz'] }, result({ steps: [step('search_news'), step('generate_quiz')] })).toolsOk).toBe(false);
  });

  it('small talk passes only if NO tool was used', () => {
    const chat = { id: 'c', category: 'small talk', question: 'hello there', expectNoTools: true };
    expect(scoreCase(chat, result()).toolsOk).toBe(true);
    expect(scoreCase(chat, result({ steps: [step('search_news')] })).toolsOk).toBe(false);
  });

  it('does not pass a run that hit the step limit even if it chose the right tool', () => {
    const row = scoreCase(search, result({ steps: [step('search_news')], stoppedReason: 'max_rounds' }));
    expect(row).toMatchObject({ toolsOk: true, answered: false, pass: false });
  });

  it('only counts citations when articles were actually found', () => {
    const none = scoreCase(search, result({ steps: [step('search_news', '0 article(s) found')] }));
    expect(none.citationApplicable).toBe(false);
    const found = scoreCase(search, result({ steps: [step('search_news', '2 article(s) found')] }));
    expect(found).toMatchObject({ citationApplicable: true, cited: false });
    const compared = scoreCase(search, result({ steps: [step('compare_regions', '4 article(s) across 2 regions')] }));
    expect(compared.citationApplicable).toBe(true);
  });

  it('a failed tool call does not count as "articles found"', () => {
    expect(scoreCase(search, result({ steps: [step('search_news', '5 article(s) found', false)] })).citationApplicable).toBe(false);
  });
});

describe('summarize', () => {
  const row = (over) => ({ ...scoreCase({ id: 'x', category: 'news', question: 'q', expectTools: ['search_news'] }, result({ steps: [step('search_news')] })), ...over });

  it('computes percentages, averages and per-category accuracy', () => {
    const rows = [
      row({ id: 'a', durationMs: 1000, tokens: 1000, steps: 1 }),
      row({ id: 'b', durationMs: 3000, tokens: 3000, steps: 3 }),
      row({ id: 'c', toolsOk: false, pass: false, category: 'quiz', durationMs: 2000, tokens: 2000, steps: 2 }),
      row({ id: 'd', toolsOk: false, answered: false, pass: false, category: 'quiz', durationMs: 6000, tokens: 6000, steps: 2 }),
    ];
    const s = summarize(rows);
    expect(s).toMatchObject({ total: 4, toolSelectionPct: 50, answeredPct: 75, passPct: 50, avgDurationMs: 3000, medianDurationMs: 2500, avgTokens: 3000, avgSteps: 2 });
    expect(s.byCategory.news).toEqual({ total: 2, toolsOk: 2, pct: 100 });
    expect(s.byCategory.quiz).toEqual({ total: 2, toolsOk: 0, pct: 0 });
  });

  it('computes the citation rate over applicable cases only (null when none apply)', () => {
    const cited = row({ citationApplicable: true, cited: true });
    const uncited = row({ citationApplicable: true, cited: false });
    const na = row({ citationApplicable: false, cited: false });
    expect(summarize([cited, uncited, na]).citationPct).toBe(50);
    expect(summarize([na]).citationPct).toBeNull();
  });

  it('counts crashed runs as failures and leaves them out of the timing averages', () => {
    const crashed = scoreError({ id: 'e', category: 'news' }, new Error('provider down'));
    const s = summarize([row({ durationMs: 4000 }), crashed]);
    expect(s).toMatchObject({ errors: 1, toolSelectionPct: 50, avgDurationMs: 4000 });
    expect(crashed.error).toBe('provider down');
  });

  it('does not grade questions the provider refused for quota; reports them separately', () => {
    const quota = scoreError({ id: 'q', category: 'news' }, Object.assign(new Error('429 rate limit'), { status: 429 }));
    const tooBig = scoreError({ id: 't', category: 'news' }, new Error('413 {"error":"Request too large"}'));
    const real = scoreError({ id: 'r', category: 'news' }, new Error('TypeError: boom'));
    expect(quota.quotaLimited).toBe(true);
    expect(tooBig.quotaLimited).toBe(true);
    expect(real.quotaLimited).toBe(false);
    const s = summarize([row({}), quota, tooBig, real]);
    expect(s).toMatchObject({ total: 4, scored: 2, quotaLimited: 2, errors: 1, toolSelectionPct: 50 });
    const md = toMarkdown(s, [row({ id: 'a' }), quota]);
    expect(md).toMatch(/Not graded: AI provider quota/);
    expect(md).toMatch(/not graded \(quota\)/);
  });

  it('handles an empty run', () => {
    expect(summarize([])).toMatchObject({ total: 0, toolSelectionPct: null, avgDurationMs: 0 });
  });
});

describe('runCases', () => {
  const cases = [
    { id: 'one', category: 'news', question: 'q1', expectTools: ['search_news'] },
    { id: 'two', category: 'news', question: 'q2', expectTools: ['search_news'] },
    { id: 'three', category: 'news', question: 'q3', expectTools: ['search_news'] },
  ];

  it('runs cases in order, one at a time, pausing between them (not after the last)', async () => {
    const order = [];
    const sleep = jest.fn(async () => { order.push('pause'); });
    const runOne = async (c) => { order.push(c.id); return result({ steps: [step('search_news')] }); };
    const rows = await runCases({ cases, runOne, delayMs: 5000, sleep });
    expect(order).toEqual(['one', 'pause', 'two', 'pause', 'three']);
    expect(sleep).toHaveBeenCalledWith(5000);
    expect(rows.map((r) => r.pass)).toEqual([true, true, true]);
  });

  it('records a crash as a failed row and carries on with the rest', async () => {
    const runOne = async (c) => { if (c.id === 'two') throw new Error('boom'); return result({ steps: [step('search_news')] }); };
    const rows = await runCases({ cases, runOne });
    expect(rows.map((r) => r.pass)).toEqual([true, false, true]);
    expect(rows[1].error).toBe('boom');
  });

  it('retries only quota-refused questions once, after waiting', async () => {
    const order = [];
    const sleep = jest.fn(async (ms) => { order.push(`wait${ms}`); });
    const tries = { two: 0 };
    const runOne = async (c) => {
      order.push(c.id);
      if (c.id === 'two' && tries.two++ === 0) throw Object.assign(new Error('429 limit'), { status: 429 });
      return result({ steps: [step('search_news')] });
    };
    const rows = await runCases({ cases, runOne, retryQuotaAfterMs: 90000, sleep });
    expect(order).toEqual(['one', 'two', 'three', 'wait90000', 'two']);
    expect(rows.map((r) => r.pass)).toEqual([true, true, true]);
  });

  it('does not retry ordinary crashes', async () => {
    const runOne = jest.fn(async (c) => { if (c.id === 'two') throw new Error('boom'); return result({ steps: [step('search_news')] }); });
    await runCases({ cases, runOne, retryQuotaAfterMs: 1000, sleep: async () => {} });
    expect(runOne).toHaveBeenCalledTimes(3);
  });

  it('reports progress after each case', async () => {
    const seen = [];
    await runCases({ cases, runOne: async () => result({ steps: [step('search_news')] }), onProgress: (row, i, total) => seen.push(`${i + 1}/${total}`) });
    expect(seen).toEqual(['1/3', '2/3', '3/3']);
  });

  it('does not pause at all when no delay is set', async () => {
    const sleep = jest.fn();
    await runCases({ cases, runOne: async () => result(), sleep });
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe('toMarkdown', () => {
  it('produces a readable report with the headline numbers and every question', () => {
    const rows = [scoreCase(CASES[0], result({ steps: [step('search_news', '2 article(s) found')], sources: [{ title: 't', url: 'https://x.com' }] }))];
    const md = toMarkdown(summarize(rows), rows, { date: '2026-10-13', model: 'm1' });
    expect(md).toContain('# Ask NexusAI — evaluation results');
    expect(md).toContain('2026-10-13');
    expect(md).toContain('**100%**');
    expect(md).toContain('news-01');
  });

  it('says n/a instead of a made-up number when no citation applied', () => {
    const rows = [scoreCase(CASES.find((c) => c.id === 'chat-01'), result())];
    expect(toMarkdown(summarize(rows), rows)).toMatch(/Cited sources.*n\/a/);
  });
});
