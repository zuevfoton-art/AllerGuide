import type { Express, Request, Response } from 'express';
import type { ScanMode } from '@allerguide/ai';

interface ClassifyPhotoRequest {
  imageBase64?: string;
}

export interface ClassifyPhotoResult {
  type: 'barcode' | 'qr' | 'menu' | 'label' | 'other';
  text: string;
  mode: ScanMode;
}

function isScanEnabled(): boolean {
  return process.env.AI_SCAN_ENABLED === 'true';
}

async function callVisionApi(imageBase64: string): Promise<ClassifyPhotoResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o';

  if (!apiKey) return null;

  const systemPrompt = [
    'You are an image classifier for an allergy app.',
    'Analyze the image and return ONLY JSON (no markdown):',
    '{"type":"menu|label|barcode|qr|other","text":"extracted text","mode":"product|menu|medicine|cosmetics"}',
    'type rules:',
    '  barcode — image shows an EAN/UPC barcode (no text needed)',
    '  qr — image is primarily a QR code (no text needed)',
    '  menu — restaurant or cafe menu with food items and prices',
    '  label — product ingredient list, medicine package, or cosmetics label',
    '  other — none of the above',
    'text: extract ALL visible text relevant to ingredients/allergens. For barcodes/QR leave empty string.',
    'mode: "product" for food/barcode, "menu" for restaurant menu, "medicine" for medicine labels, "cosmetics" for beauty/care labels.',
  ].join('\n');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const cleaned = content.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as Partial<ClassifyPhotoResult>;
    const validTypes = ['barcode', 'qr', 'menu', 'label', 'other'] as const;
    const validModes = ['product', 'menu', 'medicine', 'cosmetics'] as const;
    const type = validTypes.includes(parsed.type as any) ? (parsed.type as ClassifyPhotoResult['type']) : 'other';
    const mode = validModes.includes(parsed.mode as any) ? (parsed.mode as ScanMode) : 'product';
    return { type, text: typeof parsed.text === 'string' ? parsed.text : '', mode };
  } catch {
    return null;
  }
}

export function registerClassifyPhotoRoutes(app: Express) {
  app.post('/api/classify-photo', async (req: Request, res: Response) => {
    if (!isScanEnabled()) {
      res.status(503).json({ ok: false, error: 'AI scan is disabled on this server' });
      return;
    }

    const body = req.body as ClassifyPhotoRequest;
    const imageBase64 = body.imageBase64?.trim();

    if (!imageBase64) {
      res.status(400).json({ ok: false, error: 'Missing imageBase64' });
      return;
    }

    try {
      const result = await callVisionApi(imageBase64);
      if (!result) {
        res.status(502).json({ ok: false, error: 'Vision API unavailable or no API key' });
        return;
      }
      res.json({ ok: true, ...result });
    } catch {
      res.status(500).json({ ok: false, error: 'Classification failed' });
    }
  });
}
