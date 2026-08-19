import { importConfiguredMarketFeeds } from '../services/marketplace/import-market-feeds';
import { closeDb } from './index';

async function main() {
  const stats = await importConfiguredMarketFeeds();
  if (stats.length === 0) {
    console.log('No marketplace feeds configured. Set YANDEX_MARKET_FEED_URL and/or MARKET_PHARMACY_FEED_URL.');
    return;
  }
  console.log(JSON.stringify({ ok: true, stats }, null, 2));
}

main()
  .catch((error) => {
    console.error('Market feed import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    closeDb();
  });
