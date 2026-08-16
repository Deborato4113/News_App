const Article = require('../models/Article');
const { fetchAndEnrichNews } = require('../services/newsService');

// ── GET /api/news?region=asansol&limit=12 ─────────────────────
exports.getNews = async (req, res, next) => {
  try {
    const { region = 'mumbai', category, limit = 12 } = req.query;

    const query = { region: region.toLowerCase() };
    if (category && category !== 'All') query.category = category;

    // Return cached articles from the last 30 minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const cached = await Article.find({ ...query, fetchedAt: { $gte: thirtyMinsAgo } })
      .sort({ publishedAt: -1 })
      .limit(Number(limit));

    if (cached.length > 0) {
      return res.json({ source: 'cache', count: cached.length, articles: cached });
    }

    // Nothing fresh → fetch live
    const freshArticles = await fetchAndEnrichNews(region, Number(limit));

    const saved = [];
    for (const article of freshArticles) {
      try {
        const doc = await Article.findOneAndUpdate(
          { title: article.title, region: article.region },
          { ...article, fetchedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        saved.push(doc);
      } catch { /* duplicate — skip */ }
    }

    res.json({ source: 'live', count: saved.length, articles: saved });
  } catch (err) { next(err); }
};

// ── POST /api/news/refresh  { region } ───────────────────────
exports.refreshNews = async (req, res, next) => {
  try {
    const { region = 'mumbai', limit = 12 } = req.body;
    const freshArticles = await fetchAndEnrichNews(region, Number(limit));

    const saved = [];
    for (const article of freshArticles) {
      try {
        const doc = await Article.findOneAndUpdate(
          { title: article.title, region: article.region },
          { ...article, fetchedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        saved.push(doc);
      } catch { /* duplicate — skip */ }
    }

    res.json({ source: 'live', count: saved.length, articles: saved });
  } catch (err) { next(err); }
};

// ── GET /api/news/:id ─────────────────────────────────────────
exports.getArticleById = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json(article);
  } catch (err) { next(err); }
};
