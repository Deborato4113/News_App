// Tests for the individual tools and the analytics maths. The data layer is
// faked, so no database is needed — but the REAL tool code runs.
const { createTools, summarizeAttempts } = require('../../services/agentTools');
const { computeStats } = require('../../services/agentStats');
const { sampleArticle, makeDeps, chain } = require('../helpers/agentFakes');

const run = (tools, name, args) => {
  const tool = tools.get(name);
  const parsed = tool.schema.parse(args);
  return tool.run(parsed);
};

describe('createTools', () => {
  it('refuses to exist without an authenticated user id (fails closed)', () => {
    expect(() => createTools({ userId: undefined, deps: makeDeps().deps })).toThrow(/userId/);
    expect(() => createTools({ userId: '', deps: makeDeps().deps })).toThrow(/userId/);
  });

  it('exposes every tool in function-calling format, and none take a user id', () => {
    const tools = createTools({ userId: 'u1', deps: makeDeps().deps });
    expect(tools.names()).toEqual([
      'search_news', 'get_article', 'get_quiz_history', 'generate_quiz',
      'compare_regions', 'daily_briefing', 'bookmark_article',
    ]);
    for (const def of tools.definitions()) {
      expect(def.type).toBe('function');
      expect(def.function.description.length).toBeGreaterThan(30);
      expect(Object.keys(def.function.parameters.properties)).not.toContain('userId');
      expect(Object.keys(def.function.parameters.properties)).not.toContain('user');
    }
  });

  it('strips an attacker-supplied userId from tool arguments', () => {
    const tools = createTools({ userId: 'u1', deps: makeDeps().deps });
    const parsed = tools.get('get_quiz_history').schema.parse({ userId: 'someone-else' });
    expect(parsed).toEqual({});
  });
});

describe('search_news', () => {
  it('returns trimmed article views including the url used for citations', async () => {
    const long = 'word '.repeat(200);
    const { deps } = makeDeps({ articles: [sampleArticle({ summary: long })] });
    const tools = createTools({ userId: 'u1', deps });

    const result = await run(tools, 'search_news', { query: 'mumbai' });

    expect(result.count).toBe(1);
    const [a] = result.articles;
    expect(a).toMatchObject({ id: 'a'.repeat(24), title: 'Mumbai floods disrupt local trains', url: 'https://example.com/mumbai-floods' });
    expect(a.summary.length).toBeLessThanOrEqual(150);
    expect(a.summary.length).toBeGreaterThan(50);
    expect(a).not.toHaveProperty('likedBy');
  });

  it('scopes to a region and uses a text search', async () => {
    const { deps, seen } = makeDeps({ articles: [sampleArticle()] });
    await run(createTools({ userId: 'u1', deps }), 'search_news', { query: 'floods', region: 'Mumbai' });
    expect(seen.articleFilters[0]).toEqual({ $text: { $search: 'floods' }, region: 'mumbai' });
  });

  it('fetches fresh news once when a region has nothing cached, then searches again', async () => {
    const { deps } = makeDeps({ articles: [] });
    const result = await run(createTools({ userId: 'u1', deps }), 'search_news', { query: 'floods', region: 'mumbai' });
    expect(deps.newsService.fetchAndEnrichNews).toHaveBeenCalledWith('mumbai', 8);
    expect(deps.newsService.saveArticles).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(0);
  });

  it('does not trigger a live fetch when no region was given', async () => {
    const { deps } = makeDeps({ articles: [] });
    const result = await run(createTools({ userId: 'u1', deps }), 'search_news', { query: 'floods' });
    expect(deps.newsService.fetchAndEnrichNews).not.toHaveBeenCalled();
    expect(result.note).toMatch(/No matching articles/);
  });

  it('survives a failing live fetch', async () => {
    const { deps } = makeDeps({ articles: [] });
    deps.newsService.fetchAndEnrichNews.mockRejectedValue(new Error('newsapi down'));
    const result = await run(createTools({ userId: 'u1', deps }), 'search_news', { query: 'floods', region: 'mumbai' });
    expect(result.count).toBe(0);
  });
});

describe('search_news: duplicate guard inputs', () => {
  it('defaults to 4 results to keep the model context small', async () => {
    const { deps } = makeDeps({ articles: [sampleArticle()] });
    const tools = createTools({ userId: 'u1', deps });
    expect(tools.get('search_news').schema.parse({ query: 'floods' }).limit).toBe(4);
  });
});

describe('search_news: stale cache is refreshed for a region', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const search = (deps, args) => run(createTools({ userId: 'u1', deps }), 'search_news', args);

  it('fetches fresh news when the newest cached article is old, and returns the fresh ones', async () => {
    const old = sampleArticle({ publishedAt: new Date(Date.now() - 20 * DAY) });
    const fresh = sampleArticle({ _id: 'f'.repeat(24), title: 'Fresh story', publishedAt: new Date() });
    const { deps } = makeDeps();
    let call = 0;
    deps.Article.find.mockImplementation(() => chain(call++ === 0 ? [old] : [fresh]));

    const result = await search(deps, { query: 'jalpaiguri', region: 'Jalpaiguri' });

    expect(deps.newsService.fetchAndEnrichNews).toHaveBeenCalledWith('Jalpaiguri', 8);
    expect(result.articles[0].title).toBe('Fresh story');
    expect(result.newestArticleDate).toBe(new Date().toISOString().slice(0, 10));
  });

  it('keeps the old articles (with their dates) if the refresh finds nothing', async () => {
    const old = sampleArticle({ publishedAt: new Date(Date.now() - 20 * DAY) });
    const { deps } = makeDeps({ articles: [old] });
    const result = await search(deps, { query: 'mumbai', region: 'mumbai' });
    expect(deps.newsService.fetchAndEnrichNews).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(1);
    expect(result.newestArticleDate).toBe(old.publishedAt.toISOString().slice(0, 10));
  });

  it('does not refresh when the cache is recent', async () => {
    const { deps } = makeDeps({ articles: [sampleArticle({ publishedAt: new Date() })] });
    await search(deps, { query: 'mumbai', region: 'mumbai' });
    expect(deps.newsService.fetchAndEnrichNews).not.toHaveBeenCalled();
  });

  it('does not refresh when no region was given, however old the cache is', async () => {
    const { deps } = makeDeps({ articles: [sampleArticle({ publishedAt: new Date(Date.now() - 20 * DAY) })] });
    await search(deps, { query: 'floods' });
    expect(deps.newsService.fetchAndEnrichNews).not.toHaveBeenCalled();
  });
});

describe('search_news: refresh cooldown', () => {
  const search = (tools, args) => run(tools, 'search_news', args);

  it('refreshes a region only once in 10 minutes, even if it stays empty or fails', async () => {
    const { deps } = makeDeps({ articles: [] });
    deps.newsService.fetchAndEnrichNews.mockRejectedValue(new Error('quota'));
    const tools = createTools({ userId: 'u1', deps });
    await search(tools, { query: 'floods', region: 'Mumbai' });
    await search(tools, { query: 'rain', region: ' mumbai ' });   // same region, different spelling
    expect(deps.newsService.fetchAndEnrichNews).toHaveBeenCalledTimes(1);
  });

  it('still refreshes a different region', async () => {
    const { deps } = makeDeps({ articles: [] });
    const tools = createTools({ userId: 'u1', deps });
    await search(tools, { query: 'x1', region: 'mumbai' });
    await search(tools, { query: 'x2', region: 'delhi' });
    expect(deps.newsService.fetchAndEnrichNews).toHaveBeenCalledTimes(2);
  });

  it('allows another refresh after the cooldown', async () => {
    const { deps } = makeDeps({ articles: [] });
    const tools = createTools({ userId: 'u1', deps });
    const real = Date.now;
    try {
      let t = real();
      Date.now = () => t;
      await search(tools, { query: 'x1', region: 'mumbai' });
      t += 11 * 60 * 1000;
      await search(tools, { query: 'x2', region: 'mumbai' });
    } finally { Date.now = real; }
    expect(deps.newsService.fetchAndEnrichNews).toHaveBeenCalledTimes(2);
  });
});

describe('search_news: slow live fetch is capped', () => {
  it('stops waiting for a fresh regional fetch that never finishes and reports no results', async () => {
    jest.useFakeTimers();
    try {
      const { deps } = makeDeps({ articles: [] });
      deps.newsService.fetchAndEnrichNews.mockImplementation(() => new Promise(() => {})); // hangs forever
      const pending = run(createTools({ userId: 'u1', deps }), 'search_news', { query: 'floods', region: 'mumbai' });
      await jest.advanceTimersByTimeAsync(13_000);
      const result = await pending;
      expect(result.count).toBe(0);
      expect(result.note).toMatch(/No matching articles/);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('get_article', () => {
  it('returns details plus bias and fact-check info', async () => {
    const id = 'b'.repeat(24);
    const { deps } = makeDeps({ byId: { [id]: sampleArticle({ _id: id, biasLevel: 'high', factCheckNote: 'Unverified claim.' }) } });
    const result = await run(createTools({ userId: 'u1', deps }), 'get_article', { articleId: id });
    expect(result).toMatchObject({ id, biasLevel: 'high', factCheckNote: 'Unverified claim.' });
    expect(result.note).toMatch(/not the full article body/i);
  });

  it('returns an error result (not a throw) for an unknown id', async () => {
    const { deps } = makeDeps();
    const result = await run(createTools({ userId: 'u1', deps }), 'get_article', { articleId: 'c'.repeat(24) });
    expect(result.error).toMatch(/No article found/);
  });

  it('rejects an id that is not a 24-character hex string', () => {
    const tools = createTools({ userId: 'u1', deps: makeDeps().deps });
    expect(tools.get('get_article').schema.safeParse({ articleId: 'abc' }).success).toBe(false);
    expect(tools.get('get_article').schema.safeParse({ articleId: { $ne: null } }).success).toBe(false);
  });
});

describe('get_quiz_history', () => {
  it("queries ONLY the session user's attempts", async () => {
    const { deps, seen } = makeDeps({ attempts: [] });
    await run(createTools({ userId: 'session-user', deps }), 'get_quiz_history', { userId: 'attacker' });
    expect(seen.attemptFilters).toEqual([{ user: 'session-user' }]);
  });

  it('says so plainly when there is no history', async () => {
    const { deps } = makeDeps({ attempts: [] });
    const result = await run(createTools({ userId: 'u1', deps }), 'get_quiz_history', {});
    expect(result.totalAttempts).toBe(0);
    expect(result.message).toMatch(/not taken any quizzes/);
  });
});

describe('summarizeAttempts', () => {
  const at = (region, score, total, day) => ({ region, score, total, createdAt: new Date(`2026-10-${day}T10:00:00Z`) });

  it('finds weak topics (lowest first), strongest topic and overall score', () => {
    const summary = summarizeAttempts([ // newest first
      at('delhi', 2, 5, '05'),
      at('mumbai', 5, 5, '04'),
      at('delhi', 1, 5, '03'),
      at('london', 4, 5, '02'),
    ]);

    expect(summary.totalAttempts).toBe(4);
    expect(summary.overallPct).toBe(60);                                // 12/20
    expect(summary.weakTopics).toEqual([{ topic: 'delhi', attempts: 2, averagePct: 30 }]);
    expect(summary.strongestTopic).toMatchObject({ topic: 'mumbai', averagePct: 100 });
    expect(summary.recent[0]).toEqual({ topic: 'delhi', score: '2/5', date: '2026-10-05' });
  });

  it('caps recent attempts at 5 and weak topics at 3', () => {
    const attempts = ['a', 'b', 'c', 'd', 'e', 'f'].map((r, i) => at(r, 1, 5, `0${i + 1}`));
    const summary = summarizeAttempts(attempts);
    expect(summary.recent).toHaveLength(5);
    expect(summary.weakTopics).toHaveLength(3);
  });

  it('reports no weak topics when everything is 80%+', () => {
    expect(summarizeAttempts([at('mumbai', 5, 5, '01')]).weakTopics).toEqual([]);
  });
});

describe('generate_quiz', () => {
  it('builds a trimmed quiz from matching articles and passes difficulty through', async () => {
    const { deps } = makeDeps({ articles: [sampleArticle()] });
    const result = await run(createTools({ userId: 'u1', deps }), 'generate_quiz', { topic: 'floods', difficulty: 'hard', count: 1 });
    expect(deps.aiService.generateQuiz).toHaveBeenCalledWith(expect.any(Array), 'floods', 1, 'hard');
    expect(result).toMatchObject({ topic: 'floods', difficulty: 'hard' });
    expect(result.questions[0]).toMatchObject({ question: 'Q1?', answer: 'A' });
  });

  it('returns an error result when no articles match the topic', async () => {
    const { deps } = makeDeps({ articles: [] });
    const result = await run(createTools({ userId: 'u1', deps }), 'generate_quiz', { topic: 'nothing here' });
    expect(result.error).toMatch(/No recent articles/);
    expect(deps.aiService.generateQuiz).not.toHaveBeenCalled();
  });

  it('applies defaults and enforces limits', () => {
    const { schema } = createTools({ userId: 'u1', deps: makeDeps().deps }).get('generate_quiz');
    expect(schema.parse({ topic: 'elections' })).toEqual({ topic: 'elections', difficulty: 'medium', count: 3 });
    expect(schema.safeParse({ topic: 'elections', count: 50 }).success).toBe(false);
    expect(schema.safeParse({ topic: 'elections', difficulty: 'impossible' }).success).toBe(false);
  });
});

describe('computeStats (analytics)', () => {
  it('returns zeros for no runs', () => {
    expect(computeStats([])).toMatchObject({ totalRuns: 0, avgDurationMs: 0, topTools: [] });
  });

  it('computes averages, success rate and most-used tools', () => {
    const stats = computeStats([
      { status: 'ok', steps: 2, durationMs: 4000, totalTokens: 1000, toolsUsed: ['search_news', 'get_article'] },
      { status: 'ok', steps: 1, durationMs: 2000, totalTokens: 500, toolsUsed: ['search_news'] },
      { status: 'max_rounds', steps: 4, durationMs: 6000, totalTokens: 1500, toolsUsed: ['search_news', 'search_news', 'get_quiz_history', 'search_news'] },
      { status: 'error', steps: 0, durationMs: 0, totalTokens: 0, toolsUsed: [] },
    ]);

    expect(stats.totalRuns).toBe(4);
    expect(stats.avgDurationMs).toBe(3000);
    expect(stats.avgSteps).toBe(1.8);          // 7 tool calls / 4 runs = 1.75 → 1.8
    expect(stats.avgTokens).toBe(750);
    expect(stats.successRate).toBe(50);        // 2 of 4 status "ok"
    expect(stats.topTools[0]).toEqual({ tool: 'search_news', count: 5 });
    expect(stats.statusCounts).toEqual({ ok: 2, max_rounds: 1, error: 1 });
  });

  it('computes the thumbs-up rate from rated answers only', () => {
    const stats = computeStats([
      { status: 'ok', feedback: 'up' }, { status: 'ok', feedback: 'up' }, { status: 'ok', feedback: 'down' }, { status: 'ok' },
    ]);
    expect(stats.feedback).toEqual({ up: 2, down: 1, rated: 3, satisfactionPct: 67 });
  });

  it('reports no satisfaction figure until something is rated', () => {
    expect(computeStats([{ status: 'ok' }]).feedback).toEqual({ up: 0, down: 0, rated: 0, satisfactionPct: null });
    expect(computeStats([]).feedback.satisfactionPct).toBeNull();
  });
});


describe('compare_regions', () => {
  const compare = (deps, args) => run(createTools({ userId: 'u1', deps }), 'compare_regions', args);

  it('returns the top articles for BOTH regions, scoped by region (lowercased)', async () => {
    const fresh = sampleArticle({ publishedAt: new Date() });
    const { deps, seen } = makeDeps({ articles: [fresh] });
    const result = await compare(deps, { regionA: 'Mumbai', regionB: 'Delhi', topic: 'floods' });

    expect(result.regions.map((r) => r.region)).toEqual(['Mumbai', 'Delhi']);
    expect(result.regions.every((r) => r.count === 1)).toBe(true);
    expect(seen.articleFilters.map((f) => f.region).sort()).toEqual(['delhi', 'mumbai']);
    expect(seen.articleFilters[0]).toMatchObject({ $text: { $search: 'floods' } });
  });

  it('without a topic it lists the newest articles instead of text-searching', async () => {
    const { deps, seen } = makeDeps({ articles: [sampleArticle({ publishedAt: new Date() })] });
    await compare(deps, { regionA: 'mumbai', regionB: 'delhi' });
    expect(seen.articleFilters).toEqual([{ region: 'mumbai' }, { region: 'delhi' }]);
  });

  it('says so when nothing is found for either region', async () => {
    const { deps } = makeDeps({ articles: [] });
    const result = await compare(deps, { regionA: 'mumbai', regionB: 'delhi' });
    expect(result.note).toMatch(/Nothing found/);
  });

  it('requires two regions', () => {
    const { schema } = createTools({ userId: 'u1', deps: makeDeps().deps }).get('compare_regions');
    expect(schema.safeParse({ regionA: 'mumbai' }).success).toBe(false);
    expect(schema.parse({ regionA: 'mumbai', regionB: 'delhi' }).limit).toBe(3);
  });
});

describe('daily_briefing', () => {
  const brief = (deps) => run(createTools({ userId: 'session-user', deps }), 'daily_briefing', {});

  it("uses the session user's followed regions (max 3) and nothing from the AI", async () => {
    const { deps, seen } = makeDeps({ articles: [sampleArticle({ publishedAt: new Date() })], followedRegions: ['Mumbai', 'delhi', 'kolkata', 'chennai'] });
    const result = await brief(deps);
    expect(deps.User.findById).toHaveBeenCalledWith('session-user');
    expect(result.regions.map((r) => r.region)).toEqual(['mumbai', 'delhi', 'kolkata']);
    expect(seen.articleFilters.map((f) => f.region)).toEqual(['mumbai', 'delhi', 'kolkata']);
  });

  it('falls back to the latest stories overall when the user follows nothing', async () => {
    const { deps, seen } = makeDeps({ articles: [sampleArticle({ publishedAt: new Date() })], followedRegions: [] });
    const result = await brief(deps);
    expect(result.basedOn).toMatch(/overall/);
    expect(seen.articleFilters).toEqual([{}]);
  });

  it('reports an empty database honestly', async () => {
    const { deps } = makeDeps({ articles: [], followedRegions: [] });
    expect((await brief(deps)).note).toMatch(/No articles are stored/);
  });

  it('takes no arguments (strips an attempted userId)', () => {
    const { schema } = createTools({ userId: 'u1', deps: makeDeps().deps }).get('daily_briefing');
    expect(schema.parse({ userId: 'someone-else' })).toEqual({});
  });
});

describe('bookmark_article (proposes, never writes)', () => {
  const id = 'd'.repeat(24);
  const propose = (deps, articleId = id) => run(createTools({ userId: 'u1', deps }), 'bookmark_article', { articleId });

  it('proposes saving and tells the AI nothing is saved yet', async () => {
    const { deps } = makeDeps({ byId: { [id]: sampleArticle({ _id: id }) } });
    const result = await propose(deps);
    expect(result).toMatchObject({ status: 'awaiting_confirmation', articleId: id });
    expect(result.message).toMatch(/NOTHING has been saved/);
    expect(deps.Article.updateOne).toBeUndefined();
    expect(deps.Article.findOneAndUpdate).toBeUndefined();
  });

  it('notices an article that is already saved by this user', async () => {
    const { deps } = makeDeps({ byId: { [id]: sampleArticle({ _id: id, savedBy: ['u1'] }) } });
    expect((await propose(deps)).status).toBe('already_saved');
  });

  it("is not fooled by someone else having saved it", async () => {
    const { deps } = makeDeps({ byId: { [id]: sampleArticle({ _id: id, savedBy: ['somebody-else'] }) } });
    expect((await propose(deps)).status).toBe('awaiting_confirmation');
  });

  it('returns an error result for an unknown article and rejects malformed ids', async () => {
    const { deps } = makeDeps();
    expect((await propose(deps)).error).toMatch(/No article found/);
    const { schema } = createTools({ userId: 'u1', deps }).get('bookmark_article');
    expect(schema.safeParse({ articleId: 'abc' }).success).toBe(false);
    expect(schema.safeParse({ articleId: { $ne: null } }).success).toBe(false);
  });
});
