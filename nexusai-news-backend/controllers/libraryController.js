const mongoose   = require('mongoose');
const Collection = require('../models/Collection');
const Note       = require('../models/Note');
const Article    = require('../models/Article');
const { annotate } = require('./newsController');

const MAX_COLLECTIONS = 20;
const MAX_ARTICLES    = 200;

const isId = (v) => mongoose.isValidObjectId(v);

const shape = (c) => ({
  id: c._id,
  name: c.name,
  count: c.articles.length,
  articleIds: c.articles.map(String),
});

// ── GET /api/library/collections ────────────────────────────────
exports.listCollections = async (req, res, next) => {
  try {
    const cols = await Collection.find({ user: req.user.id }).sort({ updatedAt: -1 });
    res.json({ collections: cols.map(shape) });
  } catch (err) { next(err); }
};

// ── POST /api/library/collections  { name } ─────────────────────
exports.createCollection = async (req, res, next) => {
  try {
    const count = await Collection.countDocuments({ user: req.user.id });
    if (count >= MAX_COLLECTIONS) {
      return res.status(400).json({ message: `You can have up to ${MAX_COLLECTIONS} collections.` });
    }
    const col = await Collection.create({ user: req.user.id, name: req.body.name });
    res.status(201).json({ collection: shape(col) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You already have a collection with that name.' });
    next(err);
  }
};

// ── PATCH /api/library/collections/:id  { name } ────────────────
exports.renameCollection = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid collection id' });
    const col = await Collection.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { name: req.body.name },
      { new: true }
    );
    if (!col) return res.status(404).json({ message: 'Collection not found' });
    res.json({ collection: shape(col) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You already have a collection with that name.' });
    next(err);
  }
};

// ── DELETE /api/library/collections/:id ─────────────────────────
exports.deleteCollection = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid collection id' });
    const col = await Collection.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!col) return res.status(404).json({ message: 'Collection not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── POST /api/library/collections/:id/articles/:articleId ───────
exports.addToCollection = async (req, res, next) => {
  try {
    const { id, articleId } = req.params;
    if (!isId(id) || !isId(articleId)) return res.status(400).json({ message: 'Invalid id' });

    if (!(await Article.exists({ _id: articleId }))) {
      return res.status(404).json({ message: 'Article not found' });
    }
    const col = await Collection.findOne({ _id: id, user: req.user.id });
    if (!col) return res.status(404).json({ message: 'Collection not found' });

    if (!col.articles.some((a) => a.toString() === articleId)) {
      if (col.articles.length >= MAX_ARTICLES) {
        return res.status(400).json({ message: `A collection holds up to ${MAX_ARTICLES} articles.` });
      }
      col.articles.push(articleId);
      await col.save();
    }
    res.json({ collection: shape(col) });
  } catch (err) { next(err); }
};

// ── DELETE /api/library/collections/:id/articles/:articleId ─────
exports.removeFromCollection = async (req, res, next) => {
  try {
    const { id, articleId } = req.params;
    if (!isId(id) || !isId(articleId)) return res.status(400).json({ message: 'Invalid id' });
    const col = await Collection.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { $pull: { articles: articleId } },
      { new: true }
    );
    if (!col) return res.status(404).json({ message: 'Collection not found' });
    res.json({ collection: shape(col) });
  } catch (err) { next(err); }
};

// ── GET /api/library/notes ──────────────────────────────────────
// Lightweight map of articleId -> note text, so the UI can show a note
// marker on cards without one request per card.
exports.listNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.user.id }).select('article text updatedAt').lean();
    res.json({ notes: notes.map((n) => ({ articleId: String(n.article), text: n.text, updatedAt: n.updatedAt })) });
  } catch (err) { next(err); }
};

// ── PUT /api/library/notes/:articleId  { text } ─────────────────
exports.saveNote = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    if (!isId(articleId)) return res.status(400).json({ message: 'Invalid article id' });
    if (!(await Article.exists({ _id: articleId }))) {
      return res.status(404).json({ message: 'Article not found' });
    }
    const note = await Note.findOneAndUpdate(
      { user: req.user.id, article: articleId },
      { text: req.body.text },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ note: { articleId, text: note.text, updatedAt: note.updatedAt } });
  } catch (err) { next(err); }
};

// ── DELETE /api/library/notes/:articleId ────────────────────────
exports.deleteNote = async (req, res, next) => {
  try {
    if (!isId(req.params.articleId)) return res.status(400).json({ message: 'Invalid article id' });
    await Note.deleteOne({ user: req.user.id, article: req.params.articleId });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── GET /api/library/collections/:id/articles ───────────────────
exports.collectionArticles = async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid collection id' });
    const col = await Collection.findOne({ _id: req.params.id, user: req.user.id });
    if (!col) return res.status(404).json({ message: 'Collection not found' });

    const found = await Article.find({ _id: { $in: col.articles } });
    // Keep the order the user added them in (newest first).
    const byId = new Map(found.map((a) => [a._id.toString(), a]));
    const ordered = col.articles.map(String).reverse().map((id) => byId.get(id)).filter(Boolean);

    res.json({
      collection: shape(col),
      articles: ordered.map((a) => annotate(a, req.user.id)),
    });
  } catch (err) { next(err); }
};
