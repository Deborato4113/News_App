const Article  = require('../models/Article');
const User     = require('../models/User');
const Comment  = require('../models/Comment');
const logger   = require('../utils/logger');
const { fetchAndEnrichNews, saveArticles } = require('../services/newsService');

// ── GET /api/admin/stats ────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalArticles,
      articlesLast24h,
      flaggedCount,
      totalComments,
      byRegion,
      byCategory,
    ] = await Promise.all([
      User.countDocuments(),
      Article.countDocuments(),
      Article.countDocuments({ fetchedAt: { $gte: dayAgo } }),
      Article.countDocuments({ flagged: true }),
      Comment.countDocuments(),
      Article.aggregate([
        { $group: { _id: '$region', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Article.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      totalUsers,
      totalArticles,
      articlesLast24h,
      flaggedCount,
      totalComments,
      byRegion:   byRegion.map(r => ({ region: r._id, count: r.count })),
      byCategory: byCategory.map(c => ({ category: c._id, count: c.count })),
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/articles?flagged=true&region=&page=&limit= ──
exports.listArticles = async (req, res, next) => {
  try {
    const { flagged, region, page = 1, limit = 20 } = req.query;
    const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const pageNum  = Math.max(Number(page) || 1, 1);

    const query = {};
    if (flagged === 'true') query.flagged = true;
    if (region) query.region = region.toLowerCase();

    const [articles, total] = await Promise.all([
      Article.find(query)
        .sort({ fetchedAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      Article.countDocuments(query),
    ]);

    res.json({ articles, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) { next(err); }
};

// ── POST /api/admin/articles/:id/flag  { reason } ───────────────
exports.flagArticle = async (req, res, next) => {
  try {
    const { reason } = req.body; // validated by zod
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { flagged: true, flagReason: reason },
      { new: true }
    );
    if (!article) return res.status(404).json({ message: 'Article not found' });

    logger.info({ articleId: article._id, adminId: req.user.id, reason }, 'Article flagged');
    res.json(article);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid article id' });
    next(err);
  }
};

// ── POST /api/admin/articles/:id/unflag ─────────────────────────
exports.unflagArticle = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { flagged: false, flagReason: '' },
      { new: true }
    );
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json(article);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid article id' });
    next(err);
  }
};

// ── DELETE /api/admin/articles/:id ───────────────────────────────
exports.deleteArticle = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    await Comment.deleteMany({ article: article._id });

    logger.info({ articleId: article._id, adminId: req.user.id }, 'Article deleted by admin');
    res.json({ message: 'Article deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid article id' });
    next(err);
  }
};

// ── POST /api/admin/refresh  { regions: [...], limit } ──────────
// Bulk-triggers a live fetch+enrich for several regions at once — useful
// for pre-warming the cache instead of waiting on individual user
// searches. Runs sequentially (not in parallel) to stay well under the
// third-party API's rate limits.
exports.bulkRefresh = async (req, res, next) => {
  try {
    const { regions, limit } = req.body; // validated by zod
    const results = [];

    for (const region of regions) {
      try {
        const fresh = await fetchAndEnrichNews(region, limit);
        const saved = await saveArticles(fresh);
        results.push({ region, count: saved.length, ok: true });
      } catch (err) {
        results.push({ region, ok: false, error: err.message });
      }
    }

    res.json({ results });
  } catch (err) { next(err); }
};
