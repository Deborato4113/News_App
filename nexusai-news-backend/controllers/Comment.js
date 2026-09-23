const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:    { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true });

commentSchema.index({ article: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
