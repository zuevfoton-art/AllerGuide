import type { Express, Request, Response } from 'express';
import { validateDiscountCode } from '@allerguide/core';

interface ValidateDiscountBody {
  code?: string;
  subtotalMinor?: number;
  currency?: string;
}

export function registerDiscountRoutes(app: Express) {
  app.post('/api/discounts/validate', (req: Request, res: Response) => {
    const body = req.body as ValidateDiscountBody;
    const code = typeof body.code === 'string' ? body.code : '';
    const subtotalMinor = Number(body.subtotalMinor);

    if (!Number.isFinite(subtotalMinor) || subtotalMinor < 0) {
      res.status(400).json({ ok: false, error: 'invalid_subtotal' });
      return;
    }

    const result = validateDiscountCode({ code, subtotalMinor });
    if (!result.ok) {
      const status =
        result.error === 'empty_code' || result.error === 'invalid_subtotal' ? 400 : 404;
      res.status(status).json({ ok: false, error: result.error });
      return;
    }

    res.json({
      ok: true,
      code: result.code,
      type: result.type,
      amount: result.amount,
      discountMinor: result.discountMinor,
      totalMinor: result.totalMinor,
      subtotalMinor,
      currency: body.currency ?? 'RUB',
      description: result.description,
    });
  });
}
