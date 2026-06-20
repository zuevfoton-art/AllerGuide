import { createApp } from './app';

const PORT = process.env.API_PORT || 3001;

async function main() {
  const app = await createApp();
  app.listen(PORT, () => {
    console.log(`AllerGuide API running on port ${PORT}`);
  });
}

main().catch(console.error);
