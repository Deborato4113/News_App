const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: String,
  summary:     String,
  url:         String,
  source:      { name: String },
  region:      { type: String, required: true, lowercase: true },
  category:    { type: String, enum: ['Politics','Business','Technology','Sports','Weather','Health','General'], default: 'General' },
  sentiment:   { type: String, enum: ['pos','neg','neu'], default: 'neu' },
  publishedAt: { type: Date },
  fetchedAt:   { type: Date, default: Date.now },
  fetchSource: { type: String, enum: ['newsapi','google-rss'], default: 'newsapi' },

  // ── AI bias / fact-check flags ────────────────────────────────
  // Set by the same Groq enrichment pass that produces summary/category.
  biasLevel:     { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  factCheckNote: { type: String, default: '' }, // short caution note from the AI, empty if none

  // ── Moderation (admin dashboard) ──────────────────────────────
  flagged:    { type: Boolean, default: false },
  flagReason: { type: String, default: '' },

  // ── Social layer ───────────────────────────────────────────────
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

articleSchema.index({ title: 1, region: 1 }, { unique: true });
articleSchema.index({ region: 1, fetchedAt: -1 });
// Speeds up the common getNews query that filters on both region and category.
articleSchema.index({ region: 1, category: 1, publishedAt: -1 });
// Speeds up the admin dashboard's "show flagged articles" view.
articleSchema.index({ flagged: 1, fetchedAt: -1 });
// Speeds up "my saved articles" lookups.
articleSchema.index({ savedBy: 1 });
// Full-text search across title/summary/description, weighted so a title
// match ranks above a description match for the same query.
articleSchema.index(
  { title: 'text', summary: 'text', description: 'text' },
  { weights: { title: 5, summary: 3, description: 1 }, name: 'ArticleTextIndex' }
);
// Auto-prune: articles older than 30 days are dropped by MongoDB's TTL
// monitor so the collection doesn't grow forever. Adjust the value to
// taste (in seconds) — this does not affect the 30-minute app-level cache.
articleSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('Article', articleSchema);
