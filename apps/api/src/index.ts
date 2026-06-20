import express from 'express';
import cors from 'cors';
import { setupAuth, registerAuthRoutes } from './replit_integrations/auth';
import { registerSyncRoutes } from './routes/sync';

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(express.json({ limit: '2mb' }));
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

async function main() {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerSyncRoutes(app);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.listen(PORT, () => {
    console.log(`AllerGuide API running on port ${PORT}`);
  });
}

main().catch(console.error);
