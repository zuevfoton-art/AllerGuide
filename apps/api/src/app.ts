import path from 'path';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { registerSyncRoutes } from './routes/sync';
import { registerScanRoutes } from './routes/scan';
import { registerScanIntentRoutes } from './routes/scan-intent';
import { registerScanDishVisionRoutes } from './routes/scan-dish-vision';
import { registerOcrRoutes } from './routes/ocr';
import { registerSearchIngredientsRoutes } from './routes/search-ingredients';
import { registerSttRoutes } from './routes/stt';
import { registerMobileAuthRoutes } from './routes/mobile-auth';
import { registerProfileRoutes } from './routes/profiles';
import { registerCatalogRoutes } from './routes/catalog';
import { registerAliasFeedbackRoutes } from './routes/alias-feedback';
import { registerGovernanceRoutes } from './routes/governance';
import { registerAnalyticsRoutes } from './routes/analytics';
import { registerPollenRoutes } from './routes/pollen';
import { registerAirQualityRoutes } from './routes/air-quality';
import { registerMapsRoutes } from './routes/maps';
import { registerPlacesRoutes } from './routes/places';
import { registerMarketRoutes } from './routes/market';
import {
  buildCorsOptions,
  installRateLimiters,
} from './middleware/security';
import { buildHealthPayload } from './lib/health';

export async function createApp(): Promise<Express> {
  const app = express();

  // Correct client IPs / secure cookies when running behind a load balancer.
  app.set('trust proxy', 1);

  const isDev = Boolean(process.env.METRO_URL);
  app.use(helmet({ contentSecurityPolicy: isDev ? false : undefined }));
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '8mb' }));
  await installRateLimiters(app);

  registerMobileAuthRoutes(app);
  registerProfileRoutes(app);
  registerSyncRoutes(app);
  registerScanRoutes(app);
  registerScanIntentRoutes(app);
  registerScanDishVisionRoutes(app);
  registerOcrRoutes(app);
  registerSearchIngredientsRoutes(app);
  registerSttRoutes(app);
  registerCatalogRoutes(app);
  registerMarketRoutes(app);
  registerAliasFeedbackRoutes(app);
  registerGovernanceRoutes(app);
  registerAnalyticsRoutes(app);
  registerPollenRoutes(app);
  registerAirQualityRoutes(app);
  registerMapsRoutes(app);
  registerPlacesRoutes(app);

  app.get('/api/health', async (_req, res) => {
    const health = await buildHealthPayload();
    res.status(health.ok ? 200 : 503).json(health);
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

  return app;
}
