const mongoose = require('mongoose');

// One row per (user, article) the reader opened. Powers "dim what I've read"
// and the reading-history page. Rows expire after 90 days so the collection
// stays small — this is a convenience, not an archive.
const readingSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  readAt:  { type: Date, default: Date.now },
});

readingSchema.index({ user: 1, article: 1 }, { unique: true });
readingSchema.index({ user: 1, readAt: -1 });
readingSchema.index({ readAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('Reading', readingSchema);
