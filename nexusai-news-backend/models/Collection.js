const mongoose = require('mongoose');

// A named reading list ("Exam prep", "Read later"). Holds article refs;
// the articles themselves stay in the Article collection.
const collectionSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true, trim: true, maxlength: 40 },
  articles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
}, { timestamps: true });

collectionSchema.index({ user: 1, updatedAt: -1 });
collectionSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Collection', collectionSchema);
