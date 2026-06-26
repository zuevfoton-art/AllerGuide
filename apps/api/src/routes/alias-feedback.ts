import type { Express, Request, Response } from 'express';
import { enqueueAliasFeedback, listAliasFeedback } from '@allerguide/core';

export function registerAliasFeedbackRoutes(app: Express) {
  app.post('/api/alias-feedback', (req: Request, res: Response) => {
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

    const entry = enqueueAliasFeedback({
      term,
      suggestedAllergenId: body.suggestedAllergenId,
      context: body.context,
      profileId: body.profileId,
      scanInput: body.scanInput,
    });

    res.json({ ok: true, entry });
  });

  app.get('/api/alias-feedback', (_req: Request, res: Response) => {
    res.json({ ok: true, items: listAliasFeedback('pending') });
  });
}
