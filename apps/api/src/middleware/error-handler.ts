import type { ErrorRequestHandler, Express } from 'express';
import { logCaughtError } from '../lib/log-caught-error';

/**
 * Last-resort handler for errors passed to `next(err)` or thrown synchronously
 * in middleware. Route handlers should still use local try/catch; this closes
 * gaps so a missed catch returns JSON 500 instead of crashing the process.
 */
export function registerErrorHandler(app: Express): void {
  const handler: ErrorRequestHandler = (err, _req, res, next) => {
    logCaughtError('unhandledRouteError', err);
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(500).json({ ok: false, error: 'Internal server error' });
  };
  app.use(handler);
}
