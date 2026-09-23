const logger = require('../utils/logger');

const isProd = process.env.NODE_ENV === 'production';

module.exports = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  // Always log the full error server-side, with request context.
  logger.error(
    { err, status, method: req.method, path: req.originalUrl, reqId: req.id },
    err.message || 'Unhandled error'
  );

  // In production, never leak internal error details (stack traces, DB
  // error strings, etc.) for 5xx errors — only pass through messages we
  // set ourselves on 4xx (validation, auth) errors.
  const safeMessage =
    !isProd || status < 500 ? err.message || 'Internal server error' : 'Internal server error';

  res.status(status).json({ message: safeMessage });
};
