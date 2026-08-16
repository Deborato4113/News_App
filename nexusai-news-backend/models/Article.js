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
}, { timestamps: true });

articleSchema.index({ title: 1, region: 1 }, { unique: true });
articleSchema.index({ region: 1, fetchedAt: -1 });

module.exports = mongoose.model('Article', articleSchema);
