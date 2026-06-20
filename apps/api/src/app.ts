import express, { type Express } from 'express';
import cors from 'cors';
import { setupAuth, registerAuthRoutes } from './replit_integrations/auth';
import { registerSyncRoutes } from './routes/sync';

export async function createApp(options: { withAuth?: boolean } = {}): Promise<Express> {
  const { withAuth = true } = options;
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  if (withAuth) {
    await setupAuth(app);
    registerAuthRoutes(app);
  }

  registerSyncRoutes(app);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}
