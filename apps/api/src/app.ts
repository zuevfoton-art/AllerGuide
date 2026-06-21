import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { setupAuth, registerAuthRoutes } from './replit_integrations/auth';
import { registerSyncRoutes } from './routes/sync';
import { registerScanRoutes } from './routes/scan';
import { registerMobileAuthRoutes } from './routes/mobile-auth';
import { registerProfileRoutes } from './routes/profiles';
import {
  buildCorsOptions,
  createAuthRateLimiter,
  createGlobalRateLimiter,
  createScanRateLimiter,
} from './middleware/security';

export async function createApp(
  options: { withReplitAuth?: boolean } = {},
): Promise<Express> {
  const withReplitAuth = options.withReplitAuth ?? Boolean(process.env.REPL_ID);
  const app = express();

  // Correct client IPs / secure cookies when running behind a load balancer.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '2mb' }));
  app.use(createGlobalRateLimiter());

  app.use('/api/auth', createAuthRateLimiter());
  app.use('/api/scan', createScanRateLimiter());

  registerMobileAuthRoutes(app);
  registerProfileRoutes(app);
  registerSyncRoutes(app);
  registerScanRoutes(app);

  if (withReplitAuth) {
    await setupAuth(app);
    registerAuthRoutes(app);
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      authDatabase: Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET),
    });
  });

  return app;
}
