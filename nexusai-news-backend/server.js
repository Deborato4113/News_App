require('dotenv').config();
const express     = require('express');
const mongoose    = require('mongoose');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const pinoHttp    = require('pino-http');

const logger            = require('./utils/logger');
const errorHandler       = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiters');

const app = express();

// Trust the first proxy hop (Render/Railway/nginx etc.) so req.ip and
// rate-limiting see the real client IP instead of the proxy's.
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
app.use('/api', generalLimiter);

// Routes
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/news',  require('./routes/news'));
app.use('/api/ai',    require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/quiz',  require('./routes/quiz'));

// Health check — verifies the DB connection is actually alive, not just
// that the process is running.
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'ok' : 'degraded',
    db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
    time: new Date().toISOString(),
  });
});

// 404 for unmatched API routes
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

app.use(errorHandler);

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

module.exports = app;
