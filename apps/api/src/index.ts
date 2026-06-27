import http from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createApp } from './app';

const PORT = process.env.API_PORT || 5000;
const METRO_URL = process.env.METRO_URL;

async function runMigrationsIfNeeded() {
  if (!process.env.DATABASE_URL) return;
  try {
    const { runMigrations } = await import('./db/run-migrations');
    await runMigrations();
  } catch (err) {
    console.error('Migration error (non-fatal, continuing startup):', err);
  }
}

async function main() {
  await runMigrationsIfNeeded();

  const app = await createApp();
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`AllerGuide API running on port ${PORT}`);
  });

  if (METRO_URL) {
    const wsProxy = createProxyMiddleware({ target: METRO_URL, changeOrigin: true, ws: true });
    server.on('upgrade', wsProxy.upgrade as any);
  }
}

main().catch(console.error);
