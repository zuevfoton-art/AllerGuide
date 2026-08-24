import type { Express, Request, Response } from 'express';
import {
  parseMedicineLabelText,
  parseMedicineVisionResponse,
  parseMedicineVoiceUtterance,
} from '@allerguide/ai';
import {
  normalizeMedicineName,
  resolveMedicineAgeUsage,
  toMedicineCard,
  type MedicineCard,
  type MedicineConfidence,
  type MedicineSource,
} from '@allerguide/core';
import { verifyAuthToken } from '../lib/jwt';
import { consumeScanBudget, recordBudgetRejection } from '../lib/scan-cache';
import { logCaughtError } from '../lib/log-caught-error';
import {
  callMedicineVisionLlm,
  medicineVisionConfigured,
  VisionProviderError,
} from '../services/llm-dish-vision-provider';
import {
  bumpMedicineRecognitions,
  findMedicineByNormalizedName,
  medicineRowToCard,
  searchMedicines,
  upsertMedicineCard,
} from '../services/medicine-catalog-store';

interface RecognizeRequestBody {
  imageBase64?: string;
  mimeType?: string;
  ocrText?: string;
  name?: string;
  ageYears?: number;
  profileType?: string;
}

interface RememberRequestBody {
  name?: string;
  activeSubstance?: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
  indications?: string;
  ageUsage?: MedicineCard['ageUsage'];
  minAgeYears?: number | null;
  ingredients?: string;
  allergenTags?: string[];
  source?: MedicineSource;
  confidence?: MedicineConfidence;
}

const MIN_SEARCH_QUERY_LENGTH = 2;

function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function requireScanAuth(): boolean {
  return process.env.SCAN_REQUIRE_AUTH === 'true';
}

async function resolveScanIdentity(req: Request): Promise<string | null> {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    const payload = await verifyAuthToken(header.slice('Bearer '.length).trim());
    if (payload) return `user:${payload.sub}`;
  }
  if (requireScanAuth()) return null;
  return `ip:${req.ip ?? 'unknown'}`;
}

function parseAgeYears(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function lookupNameFromBody(body: RecognizeRequestBody): string {
  const explicit = body.name?.trim() ?? '';
  if (explicit) return explicit;
  if (!body.ocrText?.trim()) return '';
  const parsed =
    parseMedicineLabelText(body.ocrText) ?? parseMedicineVoiceUtterance(body.ocrText);
  return parsed?.name?.trim() ?? '';
}

function respondWithCard(
  res: Response,
  card: MedicineCard,
  source: MedicineSource,
  cached: boolean,
  ageYears: number | null,
) {
  res.json({
    ok: true,
    medicine: card,
    ageUsage: resolveMedicineAgeUsage(card, ageYears),
    source,
    cached,
  });
}

export function registerMedicineRoutes(app: Express) {
  app.get('/api/medicines/search', async (req: Request, res: Response) => {
    if (!databaseConfigured()) {
      res.status(503).json({ ok: false, error: 'Medicine catalog is not configured' });
      return;
    }

    const query = String(req.query.q ?? '').trim();
    if (query.length < MIN_SEARCH_QUERY_LENGTH) {
      res.status(400).json({ ok: false, error: 'Query too short' });
      return;
    }

    try {
      const rows = await searchMedicines(query);
      res.json({
        ok: true,
        source: 'catalog',
        count: rows.length,
        medicines: rows.map(medicineRowToCard),
      });
    } catch (error) {
      logCaughtError('medicines.search', error, { query });
      res.status(500).json({ ok: false, error: 'Search failed' });
    }
  });

  app.post('/api/medicines', async (req: Request, res: Response) => {
    if (!databaseConfigured()) {
      res.status(503).json({ ok: false, error: 'Medicine catalog is not configured' });
      return;
    }

    const body = req.body as RememberRequestBody;
    const name = body.name?.trim() ?? '';
    if (name.length < MIN_SEARCH_QUERY_LENGTH) {
      res.status(400).json({ ok: false, error: 'Medicine name is required' });
      return;
    }

    try {
      const card = toMedicineCard(
        {
          name,
          activeSubstance: body.activeSubstance,
          form: body.form,
          strength: body.strength,
          manufacturer: body.manufacturer,
          indications: body.indications,
          ageUsage: body.ageUsage,
          minAgeYears: body.minAgeYears,
          ingredients: body.ingredients,
          allergenTags: body.allergenTags,
          confidence: body.confidence,
        },
        body.source === 'catalog' ||
          body.source === 'vision' ||
          body.source === 'ocr' ||
          body.source === 'manual'
          ? body.source
          : 'manual',
      );
      const saved = await upsertMedicineCard(card);
      respondWithCard(res, medicineRowToCard(saved), 'catalog', false, null);
    } catch (error) {
      logCaughtError('medicines.remember', error, { name });
      res.status(500).json({ ok: false, error: 'Could not save medicine' });
    }
  });

  app.post('/api/medicines/recognize', async (req: Request, res: Response) => {
    const body = req.body as RecognizeRequestBody;
    const imageBase64 = body.imageBase64?.trim();
    const ocrText = body.ocrText?.trim() ?? '';
    const explicitName = body.name?.trim() ?? '';

    if (!imageBase64 && !ocrText && !explicitName) {
      res.status(400).json({ ok: false, error: 'Provide imageBase64, ocrText, or name' });
      return;
    }

    if (imageBase64) {
      const maxChars = Number(process.env.OCR_MAX_BASE64_CHARS || 6_000_000);
      if (imageBase64.length > maxChars) {
        res.status(413).json({ ok: false, error: 'Image too large' });
        return;
      }
    }

    const identity = await resolveScanIdentity(req);
    if (!identity) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const ageYears = parseAgeYears(body.ageYears);
    const lookupName = lookupNameFromBody(body);

    try {
      if (databaseConfigured() && lookupName) {
        const hit = await findMedicineByNormalizedName(normalizeMedicineName(lookupName));
        if (hit) {
          await bumpMedicineRecognitions(hit.id);
          respondWithCard(res, medicineRowToCard(hit), 'catalog', true, ageYears);
          return;
        }
      }

      if (imageBase64 && medicineVisionConfigured()) {
        if (!consumeScanBudget(identity)) {
          recordBudgetRejection();
          res.status(429).json({ ok: false, error: 'Daily scan budget exceeded' });
          return;
        }

        const content = await callMedicineVisionLlm({
          imageBase64,
          mimeType: body.mimeType,
          ageYears,
        });
        const parsed = parseMedicineVisionResponse(content);
        if (!parsed) {
          res.status(502).json({ ok: false, error: 'Invalid medicine vision response' });
          return;
        }

        const card = toMedicineCard(parsed, 'vision');
        if (databaseConfigured()) {
          const saved = await upsertMedicineCard(card);
          respondWithCard(res, medicineRowToCard(saved), 'vision', false, ageYears);
          return;
        }
        respondWithCard(res, card, 'vision', false, ageYears);
        return;
      }

      if (ocrText) {
        const parsed =
          parseMedicineLabelText(ocrText) ?? parseMedicineVoiceUtterance(ocrText);
        if (!parsed) {
          res.status(422).json({ ok: false, error: 'Could not parse medicine label' });
          return;
        }
        const card = toMedicineCard(parsed, 'ocr');
        if (databaseConfigured()) {
          const saved = await upsertMedicineCard(card);
          respondWithCard(res, medicineRowToCard(saved), 'ocr', false, ageYears);
          return;
        }
        respondWithCard(res, card, 'ocr', false, ageYears);
        return;
      }

      if (imageBase64 && !medicineVisionConfigured()) {
        res.status(503).json({ ok: false, error: 'Medicine vision is disabled on this server' });
        return;
      }

      if (explicitName && !databaseConfigured()) {
        res.status(503).json({ ok: false, error: 'Medicine catalog is not configured' });
        return;
      }

      res.status(404).json({ ok: false, error: 'Medicine not found' });
    } catch (error) {
      if (error instanceof VisionProviderError) {
        logCaughtError('medicines.recognize.provider', error);
        res.status(502).json({
          ok: false,
          error: error.providerError || 'Medicine vision provider unavailable',
          providerStatus: error.status,
        });
        return;
      }
      logCaughtError('medicines.recognize', error);
      res.status(500).json({ ok: false, error: 'Medicine recognition failed' });
    }
  });
}
