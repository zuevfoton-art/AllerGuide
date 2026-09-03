import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recognizeMedicineViaApi } from '@/src/services/medicines-api';
import { recognizeImageViaApi } from '@/src/services/ocr-api-service';
import { resolveProductByBarcode } from '@/src/services/barcode-lookup-service';
import {
  recognizeMedicineFromBarcode,
  recognizeMedicineFromVoice,
  recognizeMedicinePackage,
} from '@/src/services/medicine-recognition-service';

const featureState = vi.hoisted(() => ({
  MEDICINE_DB_ENABLED: false,
  YC_OCR_ENABLED: false,
}));

vi.mock('@/src/constants/features', () => ({
  get MEDICINE_DB_ENABLED() {
    return featureState.MEDICINE_DB_ENABLED;
  },
  get YC_OCR_ENABLED() {
    return featureState.YC_OCR_ENABLED;
  },
}));

vi.mock('@/src/services/medicines-api', () => ({
  recognizeMedicineViaApi: vi.fn(),
}));

vi.mock('@/src/services/ocr-api-service', () => ({
  recognizeImageViaApi: vi.fn(),
}));

vi.mock('@/src/services/barcode-lookup-service', () => ({
  resolveProductByBarcode: vi.fn(),
}));

describe('recognizeMedicinePackage', () => {
  beforeEach(() => {
    featureState.MEDICINE_DB_ENABLED = false;
    featureState.YC_OCR_ENABLED = false;
    vi.mocked(recognizeMedicineViaApi).mockReset();
    vi.mocked(recognizeImageViaApi).mockReset();
    vi.mocked(resolveProductByBarcode).mockReset();
  });

  it('returns a catalog hit from the cloud when MEDICINE_DB is on', async () => {
    featureState.MEDICINE_DB_ENABLED = true;
    vi.mocked(recognizeMedicineViaApi).mockResolvedValue({
      ok: true,
      medicine: {
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
        aliases: [],
        source: 'catalog',
        confidence: 'high',
      },
      ageUsage: { dose: '200 мг', blocked: false },
      source: 'catalog',
      cached: true,
    });

    const outcome = await recognizeMedicinePackage({
      imageBase64: 'abc',
      ageYears: 30,
    });
    expect(outcome.source).toBe('catalog');
    expect(outcome.cached).toBe(true);
    expect(outcome.card?.name).toBe('Нурофен');
    expect(recognizeMedicineViaApi).toHaveBeenCalled();
  });

  it('falls back to demo parse when the cloud is disabled', async () => {
    const outcome = await recognizeMedicinePackage({ imageBase64: 'abc' });
    expect(outcome.source).toBe('demo');
    expect(outcome.hintCode).toBe('cloud_disabled');
    expect(outcome.card?.name).toMatch(/Нурофен/i);
    expect(recognizeMedicineViaApi).not.toHaveBeenCalled();
  });

  it('parses local OCR text when the cloud recognize call fails', async () => {
    featureState.MEDICINE_DB_ENABLED = true;
    vi.mocked(recognizeMedicineViaApi).mockResolvedValue({
      ok: false,
      error: 'Medicine vision is disabled on this server',
      status: 503,
    });

    const outcome = await recognizeMedicinePackage({
      ocrText: 'Нурофен\nДействующее вещество: ибупрофен 200 мг.\nФорма выпуска: таблетки.',
      ageYears: 20,
    });
    expect(outcome.card?.name).toMatch(/Нурофен/i);
    expect(outcome.card?.activeSubstance).toMatch(/ибупрофен/i);
    expect(outcome.hintCode).toBe('cloud_failed');
    expect(outcome.source).toBe('ocr');
  });

  it('prefills a card from a spoken dose without calling demo fallback', async () => {
    const outcome = await recognizeMedicineFromVoice({
      transcript: 'принял нурофен 200 миллиграмм вечером',
      ageYears: 30,
    });
    expect(outcome.card?.name.toLowerCase()).toBe('нурофен');
    expect(outcome.card?.strength).toBe('200 мг');
    expect(outcome.hintCode).not.toBe('demo');
    expect(recognizeMedicineViaApi).not.toHaveBeenCalled();
  });

  it('rejects greetings on the voice path', async () => {
    const outcome = await recognizeMedicineFromVoice({ transcript: 'привет' });
    expect(outcome.card).toBeNull();
    expect(outcome.hintCode).toBe('not_recognized');
  });
});

describe('recognizeMedicineFromBarcode', () => {
  beforeEach(() => {
    featureState.MEDICINE_DB_ENABLED = false;
    featureState.YC_OCR_ENABLED = false;
    vi.mocked(recognizeMedicineViaApi).mockReset();
    vi.mocked(resolveProductByBarcode).mockReset();
  });
  it('returns not_recognized when the barcode is missing from catalog/OFF', async () => {
    vi.mocked(resolveProductByBarcode).mockResolvedValue(null);
    const outcome = await recognizeMedicineFromBarcode({ barcode: '4601234567890' });
    expect(outcome.card).toBeNull();
    expect(outcome.hintCode).toBe('not_recognized');
    expect(recognizeMedicineViaApi).not.toHaveBeenCalled();
  });

  it('prefills a card from the product name without demo Nurofen', async () => {
    vi.mocked(resolveProductByBarcode).mockResolvedValue({
      barcode: '4601234567890',
      name: 'Эриус 5 мг',
      ingredients: '',
      brand: 'Bayer',
      source: 'catalog_api',
      declaredAllergenIds: [],
      traceAllergenIds: [],
    });

    const outcome = await recognizeMedicineFromBarcode({
      barcode: '4601234567890',
      ageYears: 30,
    });
    expect(outcome.card?.name.toLowerCase()).toContain('эриус');
    expect(outcome.card?.name).not.toMatch(/Нурофен/i);
    expect(outcome.hintCode).not.toBe('demo');
  });

  it('uses the medicine catalog when MEDICINE_DB is on', async () => {
    featureState.MEDICINE_DB_ENABLED = true;
    vi.mocked(resolveProductByBarcode).mockResolvedValue({
      barcode: '4013054002508',
      name: 'Нурофен',
      ingredients: 'ибупрофен',
      source: 'openfoodfacts',
      declaredAllergenIds: [],
      traceAllergenIds: [],
    });
    vi.mocked(recognizeMedicineViaApi).mockResolvedValue({
      ok: true,
      medicine: {
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
        aliases: [],
        source: 'catalog',
        confidence: 'high',
      },
      ageUsage: { dose: '200 мг', blocked: false },
      source: 'catalog',
      cached: true,
    });

    const outcome = await recognizeMedicineFromBarcode({ barcode: '4013054002508' });
    expect(outcome.source).toBe('catalog');
    expect(outcome.card?.strength).toBe('200 мг');
    expect(recognizeMedicineViaApi).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Нурофен' }),
    );
  });
});
