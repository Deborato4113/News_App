const router       = require('express').Router();
const auth         = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const validate     = require('../middleware/validate');
const { agentLimiter } = require('../middleware/rateLimiters');
const { askAgentSchema, feedbackSchema, bookmarkActionSchema } = require('../schemas/agentSchemas');
const {
  ask, askStream, rateRun, confirmBookmark, getMyStats, getAllStats,
} = require('../controllers/agentController');

// Order matters: must be logged in → rate limited (each question can cost
// several AI calls) → body validated → then the agent runs.
router.post('/ask',        auth, agentLimiter, validate(askAgentSchema), ask);
router.post('/ask/stream', auth, agentLimiter, validate(askAgentSchema), askStream);

// Cheap, user-initiated actions (no AI involved).
router.patch('/runs/:id/feedback', auth, validate(feedbackSchema), rateRun);
router.post('/actions/bookmark',   auth, validate(bookmarkActionSchema), confirmBookmark);

router.get('/stats',     auth, getMyStats);
router.get('/stats/all', auth, requireAdmin, getAllStats);

module.exports = router;
