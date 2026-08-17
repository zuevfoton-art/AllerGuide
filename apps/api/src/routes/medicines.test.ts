import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetScanState } from '../lib/scan-cache';
import { registerMedicineRoutes } from './medicines';
import type { MedicineCard } from '@allerguide/core';

const catalogHit: MedicineCard = {
  name: 'Нурофен',
  activeSubstance: 'ибупрофен',
  form: 'таблетки',
  strength: '200 мг',
  manufacturer: 'Reckitt',
  indications: 'боль, температура',
  ageUsage: [{ minAgeYears: 12, dose: '200 мг' }],
  minAgeYears: 12,
  ingredients: 'ибупрофен, лактоза',
  allergenTags: ['lactose'],
  source: 'catalog',
  confidence: 'high',
};

vi.mock('../services/medicine-catalog-store', () => ({
  findMedicineByNormalizedName: vi.fn(async () => null),
  searchMedicines: vi.fn(async () => []),
  upsertMedicineCard: vi.fn(async (card: MedicineCard) => ({
    id: 'med-1',
    normalizedName: 'нурофен',
    ...card,
    recognitions: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  bumpMedicineRecognitions: vi.fn(async () => undefined),
  medicineRowToCard: vi.fn((row: MedicineCard) => ({ ...row, source: 'catalog' })),
}));

vi.mock('../services/llm-dish-vision-provider', async () => {
  const actual = await vi.importActual<typeof import('../services/llm-dish-vision-provider')>(
    '../services/llm-dish-vision-provider',
  );
  return {
    ...actual,
    medicineVisionConfigured: vi.fn(() => false),
    callMedicineVisionLlm: vi.fn(),
  };
});

vi.mock('../lib/jwt', () => ({
  verifyAuthToken: vi.fn(async () => ({ sub: 'user-1' })),
}));

describe('medicine routes', () => {
  beforeEach(async () => {
    resetScanState();
    process.env.RATE_LIMIT_DISABLED = 'true';
    process.env.SCAN_REQUIRE_AUTH = 'false';
    delete process.env.DATABASE_URL;
    vi.clearAllMocks();
    const vision = await import('../services/llm-dish-vision-provider');
    vi.mocked(vision.medicineVisionConfigured).mockReturnValue(false);
  });

  it('returns 503 for catalog search without a database', async () => {
    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app).get('/api/medicines/search?q=нурофен');
    expect(response.status).toBe(503);
  });

  it('validates short search queries', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app).get('/api/medicines/search?q=a');
    expect(response.status).toBe(400);
  });

  it('rejects recognize without image, text, or name', async () => {
    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app).post('/api/medicines/recognize').send({});
    expect(response.status).toBe(400);
  });

  it('returns 503 when an image is sent but vision is disabled', async () => {
    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .post('/api/medicines/recognize')
      .send({ imageBase64: 'aGVsbG8=' });
    expect(response.status).toBe(503);
  });

  it('parses a spoken dose from ocrText without vision', async () => {
    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .post('/api/medicines/recognize')
      .send({ ocrText: 'принял нурофен 200 миллиграмм вечером', ageYears: 30 });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.source).toBe('ocr');
    expect(response.body.medicine.name.toLowerCase()).toBe('нурофен');
    expect(response.body.medicine.strength).toBe('200 мг');
  });

  it('returns a catalog hit without calling vision', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const store = await import('../services/medicine-catalog-store');
    const vision = await import('../services/llm-dish-vision-provider');
    vi.mocked(store.findMedicineByNormalizedName).mockResolvedValueOnce({
      id: 'med-1',
      normalizedName: 'нурофен',
      ...catalogHit,
      recognitions: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(store.medicineRowToCard).mockReturnValueOnce(catalogHit);

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .post('/api/medicines/recognize')
      .send({ name: 'Нурофен', ageYears: 30 });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.source).toBe('catalog');
    expect(response.body.cached).toBe(true);
    expect(response.body.medicine.name).toBe('Нурофен');
    expect(response.body.ageUsage.dose).toBe('200 мг');
    expect(store.bumpMedicineRecognitions).toHaveBeenCalledWith('med-1');
    expect(vision.callMedicineVisionLlm).not.toHaveBeenCalled();
  });

  it('falls back to vision and upserts when the catalog misses', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const store = await import('../services/medicine-catalog-store');
    const vision = await import('../services/llm-dish-vision-provider');
    vi.mocked(vision.medicineVisionConfigured).mockReturnValue(true);
    vi.mocked(vision.callMedicineVisionLlm).mockResolvedValueOnce(
      JSON.stringify({
        name: 'Нурофен',
        activeSubstance: 'ибупрофен',
        form: 'таблетки',
        strength: '200 мг',
        manufacturer: '',
        indications: 'боль',
        ageUsage: [],
        minAgeYears: 6,
        ingredients: '',
        allergenTags: [],
        confidence: 'medium',
      }),
    );
    vi.mocked(store.upsertMedicineCard).mockResolvedValueOnce({
      id: 'med-1',
      normalizedName: 'нурофен',
      ...catalogHit,
      source: 'vision',
      confidence: 'medium',
      recognitions: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(store.medicineRowToCard).mockReturnValueOnce({
      ...catalogHit,
      source: 'catalog',
      minAgeYears: 6,
    });

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .post('/api/medicines/recognize')
      .send({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg', ageYears: 4 });

    expect(response.status).toBe(200);
    expect(response.body.source).toBe('vision');
    expect(response.body.cached).toBe(false);
    expect(response.body.ageUsage.blocked).toBe(true);
    expect(store.upsertMedicineCard).toHaveBeenCalled();
  });
});
