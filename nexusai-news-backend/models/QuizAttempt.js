const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  region: { type: String, required: true, lowercase: true },
  score:  { type: Number, required: true, min: 0 },
  total:  { type: Number, required: true, min: 1 },
}, { timestamps: true });

quizAttemptSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
