import http from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createApp } from './app';
import { assertScanAuthPolicy } from './lib/scan-auth-policy';

const PORT = process.env.PORT || process.env.API_PORT || 5000;
const METRO_URL = process.env.METRO_URL;

async function main() {
  assertScanAuthPolicy();
  const app = await createApp();
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`Aclearo API running on port ${PORT}`);
  });

  if (METRO_URL) {
    const wsProxy = createProxyMiddleware({ target: METRO_URL, changeOrigin: true, ws: true });
    server.on('upgrade', wsProxy.upgrade as any);
  }
}

main().catch(console.error);
