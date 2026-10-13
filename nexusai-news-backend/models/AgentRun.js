const mongoose = require('mongoose');

// One record per "Ask NexusAI" question — used for the analytics view
// (average response time, average steps, most-used tools). We deliberately
// store the question (clipped) but NOT the answer, to keep records small.
const agentRunSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question:    { type: String, required: true, maxlength: 500 },
  // ok = valid JSON answer · fallback = plain-text answer · max_rounds / timeout = loop stopped early · error = provider failure
  status:      { type: String, enum: ['ok', 'fallback', 'max_rounds', 'timeout', 'cancelled', 'error'], required: true },
  rounds:      { type: Number, default: 0 },          // model calls made
  steps:       { type: Number, default: 0 },          // tool calls made
  toolsUsed:   { type: [String], default: [] },       // one entry per tool call (repeats allowed)
  durationMs:  { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  models:      { type: [String], default: [] },       // which AI model(s) answered (more than one = fallback was used)
  // The user's thumbs up/down on the answer. Unset until they rate it.
  feedback:    { type: String, enum: ['up', 'down'] },
}, { timestamps: true });

agentRunSchema.index({ user: 1, createdAt: -1 });
agentRunSchema.index({ createdAt: -1 });
// Analytics don't need to live forever — drop runs after 90 days.
agentRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('AgentRun', agentRunSchema);
