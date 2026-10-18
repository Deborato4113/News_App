const mongoose = require('mongoose');

// A private note a user attaches to one article. One note per (user, article).
const noteSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  text:    { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true });

noteSchema.index({ user: 1, article: 1 }, { unique: true });

module.exports = mongoose.model('Note', noteSchema);
