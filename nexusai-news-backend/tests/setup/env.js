// Runs once per test FILE, before that file's code (including any
// `require('../app')`) executes — wired up via jest's `setupFiles`. Its job
// is to guarantee every env var app.js/controllers read from is present,
// so tests never depend on whatever happens to be in a developer's local
// .env, and never touch real third-party services.
process.env.NODE_ENV    = 'test';
process.env.JWT_SECRET  ||= 'test-jwt-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN ||= '1h';
process.env.CLIENT_URL  ||= 'http://localhost:5173';

// The Groq SDK client is constructed eagerly at module-load time
// (services/newsService.js), so it needs *some* string here even though no
// test in this suite actually calls out to Groq — a placeholder is fine.
process.env.GROQ_API_KEY ||= 'test-groq-key-unused';

// Deliberately left unset/blank in tests: NEWS_API_KEY, FIREBASE_*, SMTP_* —
// every code path that reads them already has a graceful "not configured"
// fallback (503 / log-only), so API tests that don't specifically target
// those features never need real credentials.

// MONGODB_URI is intentionally NOT set here — tests/helpers/testDb.js
// starts an in-memory MongoDB instance per test file and points mongoose
// at that instead, so tests never read or write your real Atlas cluster.
