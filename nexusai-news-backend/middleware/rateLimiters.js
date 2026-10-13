const rateLimit = require('express-rate-limit');

// Integration tests fire many requests back-to-back from the same IP within
// the same window, which would otherwise trip these limiters and make tests
// flaky/order-dependent. `skip` is an express-rate-limit option meant for
// exactly this — the limiter still exists in test env, it just never blocks.
const skipInTests = () => process.env.NODE_ENV === 'test';

// Applied to every /api/* request as a broad backstop.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Too many requests. Please try again later.' },
});

// Tight limiter for login/signup — the main brute-force / account-enumeration target.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only counts failed attempts against the limit
  skip: skipInTests,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// AI endpoints hit a paid, rate-limited third-party API (Groq) — keep this tight
// so one user can't burn through your API quota/budget.
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Too many AI requests. Please slow down and try again shortly.' },
});

// The Ask NexusAI agent: one question can trigger up to ~5 model calls plus
// tool work, so it gets its own, much tighter budget. Keyed per logged-in
// user (the route runs `auth` first) so one user can't burn the quota, and
// a shared IP (campus wifi) doesn't throttle everyone together.
const agentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || 'anonymous',
  skip: skipInTests,
  message: { message: 'You are asking too fast. Please wait a few minutes before asking NexusAI again.' },
});

module.exports = { generalLimiter, authLimiter, aiLimiter, agentLimiter };
