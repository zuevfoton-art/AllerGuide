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
  aliases: [],
  source: 'catalog',
  confidence: 'high',
};

vi.mock('../services/medicine-catalog-store', () => ({
  findMedicineByNormalizedName: vi.fn(async () => null),
  deleteMedicineByNormalizedName: vi.fn(async () => true),
  searchMedicines: vi.fn(async () => []),
  upsertMedicineCard: vi.fn(async (card: MedicineCard) => ({
    id: 'med-1',
    normalizedName: 'нурофен',
    ...card,
    aliases: card.aliases ?? [],
    recognitions: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  bumpMedicineRecognitions: vi.fn(async () => undefined),
  medicineRowToCard: vi.fn((row: MedicineCard) => ({ ...row, source: 'catalog' })),
}));

vi.mock('../services/medicine-overlay-store', () => ({
  findMedicineOverlay: vi.fn(async () => null),
  searchMedicineOverlays: vi.fn(async () => []),
  upsertMedicineOverlay: vi.fn(async (_userId: number, card: MedicineCard) => ({
    userId: 1,
    normalizedName: 'нурофен',
    ...card,
    aliases: card.aliases ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  deleteMedicineOverlay: vi.fn(async () => true),
  overlayRowToCard: vi.fn((row: MedicineCard) => ({ ...row, source: 'manual' })),
  mergeCatalogAndOverlayCards: vi.fn((catalog: MedicineCard[], overlays: MedicineCard[]) => [
    ...catalog,
    ...overlays,
  ]),
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
  verifyAuthToken: vi.fn(async () => ({ sub: 1, login: 'user@example.com', loginType: 'email' })),
}));

describe('medicine routes', () => {
  beforeEach(async () => {
    resetScanState();
    process.env.RATE_LIMIT_DISABLED = 'true';
    process.env.SCAN_REQUIRE_AUTH = 'false';
    delete process.env.DATABASE_URL;
    delete process.env.MEDICINE_WRITE_KEY;
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

  it('rejects a catalog write without a token or write key', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const store = await import('../services/medicine-catalog-store');

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app).post('/api/medicines').send({ name: 'Нурофен' });

    expect(response.status).toBe(401);
    expect(store.upsertMedicineCard).not.toHaveBeenCalled();
  });

  it('rejects a catalog write when the write key does not match', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.MEDICINE_WRITE_KEY = 'seed-secret';
    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .post('/api/medicines')
      .set('x-medicine-write-key', 'wrong')
      .send({ name: 'Нурофен' });

    expect(response.status).toBe(401);
  });

  it('writes an authenticated device card to the user overlay, not the public catalog', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const store = await import('../services/medicine-catalog-store');
    const overlay = await import('../services/medicine-overlay-store');
    vi.mocked(overlay.overlayRowToCard).mockReturnValueOnce({ ...catalogHit, source: 'manual' });

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .post('/api/medicines')
      .set('authorization', 'Bearer mobile-jwt')
      .send({ name: 'Нурофен', strength: '200 мг' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(overlay.upsertMedicineOverlay).toHaveBeenCalled();
    expect(store.upsertMedicineCard).not.toHaveBeenCalled();
  });

  it('merges the caller overlay into authenticated search', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const store = await import('../services/medicine-catalog-store');
    const overlay = await import('../services/medicine-overlay-store');
    vi.mocked(store.searchMedicines).mockResolvedValueOnce([]);
    vi.mocked(overlay.searchMedicineOverlays).mockResolvedValueOnce([
      {
        userId: 1,
        normalizedName: 'нурофен',
        ...catalogHit,
        aliases: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(overlay.overlayRowToCard).mockReturnValueOnce({ ...catalogHit, source: 'manual' });
    vi.mocked(overlay.mergeCatalogAndOverlayCards).mockReturnValueOnce([
      { ...catalogHit, source: 'manual' },
    ]);

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .get('/api/medicines/search?q=нурофен')
      .set('authorization', 'Bearer mobile-jwt');

    expect(response.status).toBe(200);
    expect(overlay.searchMedicineOverlays).toHaveBeenCalledWith(1, 'нурофен');
    expect(response.body.medicines).toHaveLength(1);
  });

  it('does not include another user overlay in anonymous search', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const store = await import('../services/medicine-catalog-store');
    const overlay = await import('../services/medicine-overlay-store');
    vi.mocked(store.searchMedicines).mockResolvedValueOnce([]);
    vi.mocked(overlay.searchMedicineOverlays).mockResolvedValueOnce([]);

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app).get('/api/medicines/search?q=нурофен');
    expect(response.status).toBe(200);
    expect(overlay.searchMedicineOverlays).not.toHaveBeenCalled();
    expect(response.body.medicines).toEqual([]);
  });

  it('remembers a typed medicine into the catalog', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.MEDICINE_WRITE_KEY = 'seed-secret';
    const store = await import('../services/medicine-catalog-store');
    vi.mocked(store.upsertMedicineCard).mockResolvedValueOnce({
      id: 'med-1',
      normalizedName: 'нурофен',
      ...catalogHit,
      source: 'manual',
      recognitions: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(store.medicineRowToCard).mockReturnValueOnce({
      ...catalogHit,
      source: 'catalog',
    });

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .post('/api/medicines')
      .set('x-medicine-write-key', 'seed-secret')
      .send({
        name: 'Нурофен',
        strength: '200 мг',
        form: 'таблетки',
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.medicine.name).toBe('Нурофен');
    expect(store.upsertMedicineCard).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Нурофен', strength: '200 мг', source: 'manual' }),
    );
  });

  it('deletes a curated card with the write key', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.MEDICINE_WRITE_KEY = 'seed-secret';
    const store = await import('../services/medicine-catalog-store');
    vi.mocked(store.deleteMedicineByNormalizedName).mockResolvedValueOnce(true);

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .delete(`/api/medicines/${encodeURIComponent('Проверка защиты')}`)
      .set('x-medicine-write-key', 'seed-secret');

    expect(response.status).toBe(200);
    expect(store.deleteMedicineByNormalizedName).toHaveBeenCalledWith('проверка защиты');
  });

  it('deletes only the caller overlay when authorized with a JWT', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const store = await import('../services/medicine-catalog-store');
    const overlay = await import('../services/medicine-overlay-store');

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .delete('/api/medicines/нурофен')
      .set('authorization', 'Bearer mobile-jwt');

    expect(response.status).toBe(200);
    expect(overlay.deleteMedicineOverlay).toHaveBeenCalledWith(1, 'нурофен');
    expect(store.deleteMedicineByNormalizedName).not.toHaveBeenCalled();
  });

  it('rejects a delete without the write key', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const store = await import('../services/medicine-catalog-store');

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app).delete('/api/medicines/нурофен');

    expect(response.status).toBe(401);
    expect(store.deleteMedicineByNormalizedName).not.toHaveBeenCalled();
  });

  it('returns 404 when the deleted card is missing', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.MEDICINE_WRITE_KEY = 'seed-secret';
    const store = await import('../services/medicine-catalog-store');
    vi.mocked(store.deleteMedicineByNormalizedName).mockResolvedValueOnce(false);

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .delete('/api/medicines/несуществующий')
      .set('x-medicine-write-key', 'seed-secret');

    expect(response.status).toBe(404);
  });

  it('rejects remember without a name', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.MEDICINE_WRITE_KEY = 'seed-secret';
    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .post('/api/medicines')
      .set('x-medicine-write-key', 'seed-secret')
      .send({ strength: '10 мг' });
    expect(response.status).toBe(400);
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
    expect(store.upsertMedicineCard).not.toHaveBeenCalled();
  });

  it('writes a vision miss to the caller overlay when a JWT is present', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const store = await import('../services/medicine-catalog-store');
    const overlay = await import('../services/medicine-overlay-store');
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
    vi.mocked(overlay.overlayRowToCard).mockReturnValueOnce({
      ...catalogHit,
      source: 'vision',
      minAgeYears: 6,
    });

    const app = express();
    app.use(express.json());
    registerMedicineRoutes(app);

    const response = await request(app)
      .post('/api/medicines/recognize')
      .set('authorization', 'Bearer mobile-jwt')
      .send({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg', ageYears: 4 });

    expect(response.status).toBe(200);
    expect(response.body.source).toBe('vision');
    expect(overlay.upsertMedicineOverlay).toHaveBeenCalled();
    expect(store.upsertMedicineCard).not.toHaveBeenCalled();
  });
});
