// The tools the "Ask NexusAI" agent can call. Each one is a thin wrapper
// around logic the app already has, and each follows the same rules:
//
//   1. Inputs from the AI are never trusted: every tool has a zod schema and
//      the loop validates the arguments BEFORE `run` is ever called.
//   2. Identity comes from the logged-in session. `createTools({ userId })`
//      captures the id once, from req.user.id, in a closure. No tool schema
//      has a user field, and zod strips unknown keys, so the AI cannot ask
//      for someone else's data even if it (or an injected article) tries.
//   3. Results are small. Everything a tool returns goes back into the AI's
//      context window, so lists are capped and long text is clipped.
//   4. Tools that would CHANGE data never do it themselves. `bookmark_article`
//      only proposes the action; the user must press Confirm in the UI, and
//      that button calls a separate, authenticated endpoint.
//
// Optional per-tool hooks used by the loop:
//   modelView(result): a smaller version of the result to show the AI.
//   artifact(result):  something for the UI to render (a quiz card, a
//                      confirm button), taken from the tool's own result and
//                      never from text the AI wrote.
const { z } = require('zod');

const clip = (text, max) => {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

const OBJECT_ID = /^[a-f\d]{24}$/i;
const REFRESH_COOLDOWN_MS = 10 * 60 * 1000; // at most one live refresh per region per 10 minutes
// region -> last refresh attempt, kept per newsService object (so each test's fake starts clean).
const refreshLogs = new WeakMap();
const refreshLog = (svc) => {
  if (!refreshLogs.has(svc)) refreshLogs.set(svc, new Map());
  return refreshLogs.get(svc);
};
const STALE_AFTER_MS = 24 * 60 * 60 * 1000; // cached news older than this triggers a fresh fetch for a region
const LIVE_FETCH_TIMEOUT_MS = 12_000; // max time search_news waits for a fresh regional fetch

// Fields we expose for an article. `url` matters: it is how the AI cites.
const ARTICLE_FIELDS = 'title summary description url source region category sentiment publishedAt';

// Compact on purpose: every field here is re-sent to the model on EVERY
// later round, and free-tier AI quotas are counted in tokens per minute.
function toArticleView(a, summaryMax = 150) {
  return {
    id: String(a._id),
    title: clip(a.title, 140),
    summary: clip(a.summary || a.description, summaryMax),
    source: a.source?.name || '',
    category: a.category,
    date: a.publishedAt ? new Date(a.publishedAt).toISOString().slice(0, 10) : null,
    url: a.url || '',
  };
}

// Loaded lazily so unit tests of the loop never need Mongoose models.
function defaultDeps() {
  return {
    Article: require('../models/Article'),
    QuizAttempt: require('../models/QuizAttempt'),
    newsService: require('./newsService'),
    aiService: require('./aiService'),
    User: require('../models/User'),
  };
}

// ── Pure helper (unit-tested without a database) ────────────────────
// attempts: newest-first [{ region, score, total, createdAt }]
function summarizeAttempts(attempts) {
  if (!attempts.length) {
    return {
      totalAttempts: 0,
      message: 'This user has not taken any quizzes yet, so there is no history or weak-topic data.',
    };
  }

  const byTopic = new Map();
  let scoreSum = 0;
  let totalSum = 0;
  for (const a of attempts) {
    const t = byTopic.get(a.region) || { topic: a.region, attempts: 0, score: 0, total: 0 };
    t.attempts += 1;
    t.score += a.score;
    t.total += a.total;
    byTopic.set(a.region, t);
    scoreSum += a.score;
    totalSum += a.total;
  }

  const topics = [...byTopic.values()]
    .map((t) => ({ topic: t.topic, attempts: t.attempts, averagePct: Math.round((t.score / t.total) * 100) }))
    .sort((x, y) => x.averagePct - y.averagePct);

  return {
    totalAttempts: attempts.length,
    overallPct: Math.round((scoreSum / totalSum) * 100),
    // Lowest-scoring topics first; only topics under 80% count as "weak".
    weakTopics: topics.filter((t) => t.averagePct < 80).slice(0, 3),
    strongestTopic: topics[topics.length - 1],
    recent: attempts.slice(0, 5).map((a) => ({
      topic: a.region,
      score: `${a.score}/${a.total}`,
      date: new Date(a.createdAt).toISOString().slice(0, 10),
    })),
  };
}

function createTools({ userId, deps = {} }) {
  // Fail closed: a tool set with no authenticated user must not exist.
  if (!userId) throw new Error('createTools requires an authenticated userId');

  const { Article, QuizAttempt, User, newsService, aiService } = { ...defaultDeps(), ...deps };

  const searchCached = (query, region, limit) => {
    const filter = { $text: { $search: query } };
    if (region) filter.region = region.toLowerCase();
    return Article.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select(`${ARTICLE_FIELDS} score`)
      .lean();
  };

  // Newest articles for a region, no keywords.
  const latestCached = (region, limit) =>
    Article.find(region ? { region: region.toLowerCase() } : {})
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select(ARTICLE_FIELDS)
      .lean();

  const lookup = ({ query, region, limit }) => (query ? searchCached(query, region, limit) : latestCached(region, limit));

  // Articles for a query and/or region, refreshed when needed.
  // Fresh news for a region: use the app's existing NewsAPI/RSS pipeline
  // when nothing is cached for it OR the newest cached article is old
  // (so "today's news" is really today's). The pipeline summarises every
  // article with the AI, which can be slow, so it is capped: if it doesn't
  // finish in time we keep what we had (the fetch keeps running and caches
  // for next time).
  // A live fetch costs NewsAPI quota + AI tokens. Once a region was refreshed
  // (or tried) recently, don't do it again for every question about it.
  const refreshedAt = refreshLog(newsService);
  const refreshAllowed = (region) => {
    const key = String(region).trim().toLowerCase();
    const last = refreshedAt.get(key) || 0;
    if (Date.now() - last < REFRESH_COOLDOWN_MS) return false;
    refreshedAt.set(key, Date.now()); // marked BEFORE fetching so parallel/failed attempts also count
    return true;
  };

  const findArticles = async ({ query, region, limit }) => {
    let found = await lookup({ query, region, limit });

    const newestMs = found.reduce((m, a) => Math.max(m, a.publishedAt ? new Date(a.publishedAt).getTime() : 0), 0);
    const stale = found.length > 0 && Date.now() - newestMs > STALE_AFTER_MS;
    if (region && (!found.length || stale) && refreshAllowed(region)) {
      let timer;
      const liveFetch = (async () => {
        try {
          const fresh = await newsService.fetchAndEnrichNews(region, 8);
          await newsService.saveArticles(fresh);
          return await lookup({ query, region, limit });
        } catch {
          return []; /* best-effort: fall through to what we already have */
        }
      })();
      const giveUp = new Promise((resolve) => { timer = setTimeout(() => resolve([]), LIVE_FETCH_TIMEOUT_MS); });
      const refreshed = await Promise.race([liveFetch, giveUp]).finally(() => clearTimeout(timer));
      if (refreshed.length) found = refreshed;
    }
    return found;
  };

  const newestDate = (articles) => articles.map((a) => a.date).filter(Boolean).sort().pop();
  const DATE_NOTE = 'Each article has a date. If the user asked for today\'s or the latest news and the newest article is older than today, say so and give its date.';

  const tools = [
    // ── 1. search_news ──────────────────────────────────────────
    {
      name: 'search_news',
      description:
        'Search recent news by keyword (id, title, summary, source, date, url; best match first). Use first for current-events ' +
        'questions. One search is usually enough. If the user names a place, ALWAYS set region to it: fresh news is fetched when the cache is empty or old.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keywords to search for, e.g. "monsoon flooding"' },
          region: { type: 'string', description: 'Optional region/city, e.g. "mumbai"' },
          limit: { type: 'integer', description: 'How many articles to return (1-8, default 4)' },
        },
        required: ['query'],
      },
      schema: z.object({
        query: z.string().trim().min(2).max(100),
        region: z.string().trim().min(2).max(60).nullish(),
        limit: z.coerce.number().int().min(1).max(8).default(4),
      }),
      async run({ query, region, limit }) {
        const found = await findArticles({ query, region, limit });

        if (!found.length) {
          return { count: 0, articles: [], note: 'No matching articles found in the cache. Do not keep searching: tell the user nothing was found, or answer from other tools.' };
        }
        const articles = found.map((a) => toArticleView(a));
        return { count: found.length, articles, newestArticleDate: newestDate(articles), note: DATE_NOTE };
      },
      summarize: (r) => `${r.count ?? 0} article(s) found`,
    },

    // ── 2. get_article ──────────────────────────────────────────
    {
      name: 'get_article',
      description:
        'More detail on ONE article by id from search_news: description, bias level, fact-check note. Not the full web page.',
      parameters: {
        type: 'object',
        properties: {
          articleId: { type: 'string', description: 'The article id from search_news results' },
        },
        required: ['articleId'],
      },
      schema: z.object({
        articleId: z.string().trim().regex(OBJECT_ID, 'articleId must be a 24-character article id from search_news'),
      }),
      async run({ articleId }) {
        const a = await Article.findById(articleId).lean();
        if (!a) return { error: 'No article found with that id.' };
        return {
          ...toArticleView(a, 240),
          description: clip(a.description, 1200),
          biasLevel: a.biasLevel,
          factCheckNote: clip(a.factCheckNote, 300),
          note: 'Only the description and summary are stored, not the full article body.',
        };
      },
      summarize: (r) => `"${clip(r.title, 60)}"`,
    },

    // ── 3. get_quiz_history ─────────────────────────────────────
    {
      name: 'get_quiz_history',
      description:
        "The CURRENT user's quiz performance: overall score, weakest/strongest topics, recent attempts. No arguments. " +
        'Use for progress, weak areas or what to study.',
      parameters: { type: 'object', properties: {} },
      schema: z.object({}),
      async run() {
        // userId is the closure value from the session, never from the AI.
        const attempts = await QuizAttempt.find({ user: userId })
          .sort({ createdAt: -1 })
          .limit(50)
          .select('region score total createdAt')
          .lean();
        return summarizeAttempts(attempts);
      },
      summarize: (r) => (r.totalAttempts ? `${r.totalAttempts} attempt(s), ${r.overallPct}% overall` : 'no quiz history'),
    },

    // ── 4. generate_quiz ────────────────────────────────────────
    {
      name: 'generate_quiz',
      description:
        'Make a 1-5 question multiple-choice quiz on a topic from recent news. Use when the user wants to be quizzed. ' +
        'It appears as an interactive card, so do NOT repeat the questions or answers; introduce it in one sentence.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic or region to quiz on, e.g. "elections" or "mumbai"' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], description: 'Default medium' },
          count: { type: 'integer', description: 'Number of questions, 1-5 (default 3)' },
        },
        required: ['topic'],
      },
      schema: z.object({
        topic: z.string().trim().min(2).max(80),
        difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
        count: z.coerce.number().int().min(1).max(5).default(3),
      }),
      async run({ topic, difficulty, count }) {
        const articles = await Article.find({ $text: { $search: topic } }, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(8)
          .select('title summary description')
          .lean();

        if (!articles.length) {
          return { error: `No recent articles found about "${topic}" to build a quiz from.` };
        }

        const questions = await aiService.generateQuiz(articles, topic, count, difficulty);
        if (!Array.isArray(questions) || !questions.length) {
          return { error: 'Quiz generation failed. Try a different topic.' };
        }

        return {
          topic,
          difficulty,
          questions: questions.slice(0, count).map((q) => ({
            question: clip(q.question, 300),
            options: (Array.isArray(q.options) ? q.options : []).slice(0, 4).map((o) => clip(o, 120)),
            answer: q.answer,
            explanation: clip(q.explanation, 200),
          })),
        };
      },
      summarize: (r) => `${r.questions?.length ?? 0} question(s) on "${r.topic}" (${r.difficulty})`,
      // The AI doesn't need the questions/answers (the UI shows them), which
      // also saves tokens: it only needs to know the quiz exists.
      modelView: (r) => ({
        topic: r.topic,
        difficulty: r.difficulty,
        questionCount: r.questions.length,
        note: 'The quiz is now shown to the user as an interactive card. Do not repeat the questions or answers.',
      }),
      artifact: (r) => ({ kind: 'quiz', topic: r.topic, difficulty: r.difficulty, questions: r.questions }),
    },

    // ── 5. compare_regions ──────────────────────────────────────
    {
      name: 'compare_regions',
      description:
        'Compare the news in TWO places: top recent articles for each, optional topic keyword. Use for "compare X and Y" instead of two searches.',
      parameters: {
        type: 'object',
        properties: {
          regionA: { type: 'string', description: 'First region/city, e.g. "mumbai"' },
          regionB: { type: 'string', description: 'Second region/city, e.g. "delhi"' },
          topic: { type: 'string', description: 'Optional keyword to focus on, e.g. "flooding"' },
          limit: { type: 'integer', description: 'Articles per region (1-5, default 3)' },
        },
        required: ['regionA', 'regionB'],
      },
      schema: z.object({
        regionA: z.string().trim().min(2).max(60),
        regionB: z.string().trim().min(2).max(60),
        topic: z.string().trim().min(2).max(100).nullish(),
        limit: z.coerce.number().int().min(1).max(5).default(3),
      }),
      async run({ regionA, regionB, topic, limit }) {
        const query = topic || undefined;
        // Both sides in parallel: a slow live fetch for one must not double the wait.
        const [a, b] = await Promise.all([
          findArticles({ query, region: regionA, limit }),
          findArticles({ query, region: regionB, limit }),
        ]);
        const regions = [[regionA, a], [regionB, b]].map(([region, list]) => ({
          region,
          count: list.length,
          articles: list.map((x) => toArticleView(x)),
        }));
        const all = regions.flatMap((r) => r.articles);
        return {
          regions,
          ...(all.length && { newestArticleDate: newestDate(all) }),
          note: all.length ? DATE_NOTE : 'Nothing found for either region. Tell the user; do not keep searching.',
        };
      },
      summarize: (r) => `${r.regions.reduce((n, x) => n + x.count, 0)} article(s) across ${r.regions.length} regions`,
    },

    // ── 6. daily_briefing ───────────────────────────────────────
    {
      name: 'daily_briefing',
      description:
        "The CURRENT user's news briefing: latest stories from regions they follow (or overall). No arguments. " +
        'Use for "my briefing", "what did I miss", "catch me up".',
      parameters: { type: 'object', properties: {} },
      schema: z.object({}),
      async run() {
        // userId is the closure value from the session, never from the AI.
        const me = await User.findById(userId).select('followedRegions').lean();
        const followed = [...new Set((me?.followedRegions || []).map((r) => String(r).toLowerCase()))].slice(0, 3);

        if (!followed.length) {
          const list = await latestCached(undefined, 5);
          const articles = list.map((x) => toArticleView(x));
          return {
            basedOn: 'latest stories overall (the user follows no regions yet)',
            regions: [{ region: 'all', count: articles.length, articles }],
            ...(articles.length && { newestArticleDate: newestDate(articles) }),
            note: articles.length ? DATE_NOTE : 'No articles are stored yet. Tell the user to open a region feed first.',
          };
        }

        const lists = await Promise.all(followed.map((region) => latestCached(region, 2)));
        const regions = followed.map((region, i) => ({
          region,
          count: lists[i].length,
          articles: lists[i].map((x) => toArticleView(x)),
        }));
        const all = regions.flatMap((r) => r.articles);
        return {
          basedOn: 'regions the user follows',
          regions,
          ...(all.length && { newestArticleDate: newestDate(all) }),
          note: all.length ? DATE_NOTE : 'Nothing stored for the followed regions yet. Tell the user.',
        };
      },
      summarize: (r) => `${r.regions.reduce((n, x) => n + x.count, 0)} article(s) from ${r.regions.length} region(s)`,
    },

    // ── 7. bookmark_article (PROPOSES only) ─────────────────────
    {
      name: 'bookmark_article',
      description:
        'Propose saving ONE article (id from search_news) to the user\'s saved list. Saves nothing yet: the user sees a Confirm button. ' +
        'Only when asked to save/bookmark. Tell them to press Confirm.',
      parameters: {
        type: 'object',
        properties: { articleId: { type: 'string', description: 'Article id' } },
        required: ['articleId'],
      },
      schema: z.object({
        articleId: z.string().trim().regex(OBJECT_ID, 'articleId must be a 24-character article id from search_news'),
      }),
      async run({ articleId }) {
        const a = await Article.findById(articleId).lean();
        if (!a) return { error: 'No article found with that id.' };
        const already = (a.savedBy || []).some((id) => String(id) === String(userId));
        if (already) return { status: 'already_saved', title: clip(a.title, 140), message: 'This article is already in the user\'s saved list.' };
        return {
          status: 'awaiting_confirmation',
          articleId: String(a._id),
          title: clip(a.title, 140),
          message: 'NOTHING has been saved yet. The user now sees a Confirm button. Tell them to press it to save the article.',
        };
      },
      summarize: (r) => (r.status === 'already_saved' ? 'already saved' : `proposed saving "${clip(r.title, 50)}"`),
      artifact: (r) => (r.status === 'awaiting_confirmation'
        ? { kind: 'action', action: 'bookmark', articleId: r.articleId, title: r.title }
        : null),
    },
  ];

  const byName = new Map(tools.map((t) => [t.name, t]));

  return {
    list: tools,
    get: (name) => byName.get(name),
    names: () => tools.map((t) => t.name),
    // OpenAI/Groq function-calling format.
    definitions: () =>
      tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
  };
}

module.exports = { createTools, summarizeAttempts, clip };
