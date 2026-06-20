import express, { type Express } from 'express';
import cors from 'cors';
import { setupAuth, registerAuthRoutes } from './replit_integrations/auth';
import { registerSyncRoutes } from './routes/sync';
import { registerScanRoutes } from './routes/scan';
import { registerMobileAuthRoutes } from './routes/mobile-auth';
import { registerProfileRoutes } from './routes/profiles';

export async function createApp(
  options: { withReplitAuth?: boolean } = {},
): Promise<Express> {
  const withReplitAuth = options.withReplitAuth ?? Boolean(process.env.REPL_ID);
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

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
