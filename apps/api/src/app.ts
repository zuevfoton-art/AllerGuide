import path from 'path';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { setupAuth, registerAuthRoutes } from './replit_integrations/auth';
import { registerSyncRoutes } from './routes/sync';
import { registerScanRoutes } from './routes/scan';
import { registerMobileAuthRoutes } from './routes/mobile-auth';
import { registerProfileRoutes } from './routes/profiles';
import { registerCatalogRoutes } from './routes/catalog';
import { registerAliasFeedbackRoutes } from './routes/alias-feedback';
import { registerGovernanceRoutes } from './routes/governance';
import { registerClassifyPhotoRoutes } from './routes/classify-photo';
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

  const isDev = Boolean(process.env.METRO_URL);
  app.use(
    helmet({
      contentSecurityPolicy: isDev
        ? false
        : {
            directives: {
              ...helmet.contentSecurityPolicy.getDefaultDirectives(),
              // Allow Yandex static map images rendered by the web client.
              'img-src': ["'self'", 'data:', 'https://static-maps.yandex.ru'],
              // Allow the Yandex map widget iframe on native WebView builds.
              'frame-src': ["'self'", 'https://yandex.ru'],
            },
          },
    }),
  );
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '8mb' }));
  app.use(createGlobalRateLimiter());

  app.use('/api/auth', createAuthRateLimiter());
  app.use('/api/scan', createScanRateLimiter());

  registerMobileAuthRoutes(app);
  registerProfileRoutes(app);
  registerSyncRoutes(app);
  registerScanRoutes(app);
  registerCatalogRoutes(app);
  registerAliasFeedbackRoutes(app);
  registerGovernanceRoutes(app);
  registerClassifyPhotoRoutes(app);

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

  const metroUrl = process.env.METRO_URL;
  if (metroUrl) {
    app.use(
      createProxyMiddleware({
        target: metroUrl,
        changeOrigin: true,
      })
    );
  } else {
    const distDir = path.resolve(__dirname, '../../mobile/dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled route error:', err);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  return app;
}
