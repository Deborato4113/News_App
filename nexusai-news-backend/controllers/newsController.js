const Article = require('../models/Article');
const { fetchAndEnrichNews, saveArticles } = require('../services/newsService');

// Shapes an Article doc for the API response: replaces the raw likedBy/
// savedBy id arrays (which would otherwise expose every liker's user id
// to every client) with a count plus "did *this* user like/save it"
// booleans. Used everywhere articles go out to a logged-in user so the
// like/save buttons render in the right state on load, not just after
// a click — fixes the earlier bug where the heart always started empty.
function annotate(doc, userId) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const likedBy = obj.likedBy || [];
  const savedBy = obj.savedBy || [];
  return {
    ...obj,
    likedBy: undefined,
    savedBy: undefined,
    likeCount: likedBy.length,
    saveCount: savedBy.length,
    likedByMe: userId ? likedBy.some((id) => id.toString() === userId) : false,
    savedByMe: userId ? savedBy.some((id) => id.toString() === userId) : false,
  };
}

// ── GET /api/news?region=asansol&category=Politics&page=1&limit=12 ─
exports.getNews = async (req, res, next) => {
  try {
    const { region = 'mumbai', category, limit = 12, page = 1 } = req.query;

    const pageSize = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const pageNum  = Math.max(Number(page) || 1, 1);
    const skip     = (pageNum - 1) * pageSize;

    const query = { region: region.toLowerCase() };
    if (category && category !== 'All') query.category = category;

    // Return cached articles from the last 30 minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const cacheQuery = { ...query, fetchedAt: { $gte: thirtyMinsAgo } };

    const [cached, total] = await Promise.all([
      Article.find(cacheQuery).sort({ publishedAt: -1 }).skip(skip).limit(pageSize),
      Article.countDocuments(cacheQuery),
    ]);

    if (cached.length > 0) {
      return res.json({
        source: 'cache',
        count: cached.length,
        total,
        page: pageNum,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        articles: cached.map((a) => annotate(a, req.user?.id)),
      });
    }

    // Nothing fresh → fetch live (only makes sense for page 1; deeper
    // pages of a not-yet-fetched region simply return empty until a
    // refresh has populated the cache)
    const freshArticles = await fetchAndEnrichNews(region, pageSize);
    const saved = await saveArticles(freshArticles);

    res.json({
      source: 'live',
      count: saved.length,
      total: saved.length,
      page: 1,
      pageSize,
      totalPages: 1,
      articles: saved.map((a) => annotate(a, req.user?.id)),
    });
  } catch (err) { next(err); }
};

// ── POST /api/news/refresh  { region, limit } ─────────────────
exports.refreshNews = async (req, res, next) => {
  try {
    const { region, limit } = req.body; // already validated/defaulted by zod
    const freshArticles = await fetchAndEnrichNews(region, limit);
    const saved = await saveArticles(freshArticles);

    res.json({ source: 'live', count: saved.length, articles: saved.map((a) => annotate(a, req.user?.id)) });
  } catch (err) { next(err); }
};

// ── GET /api/news/search?q=&limit=&page= ────────────────────────
// Full-text search across ALL cached articles (any region), using the
// text index defined on the Article model. Searches what's already been
// fetched/cached — it does not trigger a new live fetch, since a search
// query isn't a region NewsAPI/RSS can be queried with directly.
exports.searchArticles = async (req, res, next) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ message: 'q (search query) is required' });

    const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const pageNum  = Math.max(Number(page) || 1, 1);

    const filter = { $text: { $search: q.trim() } };
    const projection = { score: { $meta: 'textScore' } };

    const [results, total] = await Promise.all([
      Article.find(filter, projection)
        .sort({ score: { $meta: 'textScore' } })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      Article.countDocuments(filter),
    ]);

    res.json({
      query: q,
      total,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      articles: results.map((a) => annotate(a, req.user?.id)),
    });
  } catch (err) { next(err); }
};

// ── GET /api/news/trending?region=&hours=24 ──────────────────────
// Aggregates category and sentiment counts for recently-fetched articles,
// optionally scoped to one region. Purely reads what's already cached —
// no live fetch.
exports.getTrending = async (req, res, next) => {
  try {
    const { region, hours = 24 } = req.query;
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const match = { fetchedAt: { $gte: since } };
    if (region) match.region = region.toLowerCase();

    const [byCategory, bySentiment, total] = await Promise.all([
      Article.aggregate([
        { $match: match },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Article.aggregate([
        { $match: match },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]),
      Article.countDocuments(match),
    ]);

    res.json({
      region: region || 'all',
      hours: Number(hours),
      total,
      byCategory: byCategory.map((c) => ({ category: c._id, count: c.count })),
      bySentiment: bySentiment.map((s) => ({ sentiment: s._id, count: s.count })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/news/saved?page=&limit= ─────────────────────────────
exports.getSavedArticles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const pageNum  = Math.max(Number(page) || 1, 1);

    const filter = { savedBy: req.user.id };

    const [articles, total] = await Promise.all([
      Article.find(filter)
        .sort({ fetchedAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      Article.countDocuments(filter),
    ]);

    res.json({
      total,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      articles: articles.map((a) => annotate(a, req.user.id)),
    });
  } catch (err) { next(err); }
};

// ── POST /api/news/:id/save  (toggle) ────────────────────────────
exports.toggleSave = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    const userId = req.user.id;
    const alreadySaved = article.savedBy.some((id) => id.toString() === userId);

    if (alreadySaved) {
      article.savedBy = article.savedBy.filter((id) => id.toString() !== userId);
    } else {
      article.savedBy.push(userId);
    }
    await article.save();

    res.json({ saved: !alreadySaved, saveCount: article.savedBy.length });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid article id' });
    next(err);
  }
};

// ── GET /api/news/:id ─────────────────────────────────────────
// NOTE: registered LAST among GET /:something routes so it doesn't shadow
// the more specific /search, /trending and /saved routes above.
exports.getArticleById = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json(annotate(article, req.user?.id));
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid article id' });
    next(err);
  }
};

// ── POST /api/news/:id/like  (toggle) ──────────────────────────
exports.toggleLike = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    const userId = req.user.id;
    const alreadyLiked = article.likedBy.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      article.likedBy = article.likedBy.filter((id) => id.toString() !== userId);
    } else {
      article.likedBy.push(userId);
    }
    await article.save();

    res.json({ liked: !alreadyLiked, likeCount: article.likedBy.length });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid article id' });
    next(err);
  }
};
