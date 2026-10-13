// The Express app itself — routes, middleware, error handling — with NO
// side effects (no DB connection, no app.listen). Split out from server.js
// so tests can `require('../app')` and hit it with supertest without
// spinning up a real port or touching the real database.
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

// Skip request logging entirely during tests — keeps `jest` output readable.
if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
}

app.use('/api', generalLimiter);

// Routes
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/news',  require('./routes/news'));
app.use('/api/ai',    require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/quiz',  require('./routes/quiz'));
app.use('/api/agent', require('./routes/agent'));

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

module.exports = app;
