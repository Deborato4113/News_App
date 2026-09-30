// Entry point: connects to MongoDB, then starts the HTTP server. All the
// actual Express app (routes/middleware) lives in app.js — that's the part
// tests import directly via supertest, without this file's side effects.
require('dotenv').config();
const mongoose = require('mongoose');
const app      = require('./app');
const logger   = require('./utils/logger');

let server;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('MongoDB connected');

    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error({ err }, 'MongoDB connection failed');
    process.exit(1);
  });

// ── Crash safety ────────────────────────────────────────────────
// Without these, an unhandled rejection or a stray throw outside an
// Express handler kills the process silently (or leaves it in a broken
// state) with no useful log line.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  // An uncaught exception means the process is in an unknown state;
  // exit so the process manager (Docker/PM2/Render) restarts it cleanly.
  process.exit(1);
});

// ── Graceful shutdown ───────────────────────────────────────────
function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  if (server) {
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        logger.info('HTTP server and MongoDB connection closed');
        process.exit(0);
      });
    });
    // Force-exit if shutdown hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
