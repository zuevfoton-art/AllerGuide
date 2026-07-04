import type { Express, Request, Response } from 'express';
import { persistAliasFeedback, listPendingAliasFeedbackDb, updateAliasFeedbackStatus } from '../services/alias-feedback-service';

function adminKeyValid(req: Request): boolean {
  const expected = process.env.ALIAS_FEEDBACK_ADMIN_KEY?.trim();
  if (!expected) return false;
  return req.header('x-alias-feedback-admin-key') === expected;
}

export function registerAliasFeedbackRoutes(app: Express) {
  app.post('/api/alias-feedback', async (req: Request, res: Response) => {
    const body = req.body as {
      term?: string;
      suggestedAllergenId?: string;
      context?: string;
      profileId?: number;
      scanInput?: string;
    };

    const term = String(body.term ?? '').trim();
    if (term.length < 2) {
      res.status(400).json({ ok: false, error: 'Term too short' });
      return;
    }

    const entry = await persistAliasFeedback({
      term,
      suggestedAllergenId: body.suggestedAllergenId,
      context: body.context,
      profileId: body.profileId,
      scanInput: body.scanInput,
    });

    res.json({ ok: true, entry });
  });

  app.get('/api/alias-feedback', async (req: Request, res: Response) => {
    if (!adminKeyValid(req)) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const items = await listPendingAliasFeedbackDb();
    res.json({ ok: true, items });
  });

  app.patch('/api/alias-feedback/:id', async (req: Request, res: Response) => {
    if (!adminKeyValid(req)) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const { status } = req.body as { status?: 'approved' | 'rejected' };
    if (status !== 'approved' && status !== 'rejected') {
      res.status(400).json({ ok: false, error: 'Invalid status' });
      return;
    }

    const ok = await updateAliasFeedbackStatus(String(req.params.id), status);
    if (!ok) {
      res.status(404).json({ ok: false, error: 'Not found' });
      return;
    }

    res.json({ ok: true });
  });
}
