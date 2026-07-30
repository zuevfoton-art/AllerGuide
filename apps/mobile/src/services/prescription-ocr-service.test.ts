import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recognizeImageViaApi } from '@/src/services/ocr-api-service';
import { recognizePrescription } from '@/src/services/prescription-ocr-service';

const featureState = vi.hoisted(() => ({ YC_OCR_ENABLED: true }));

vi.mock('@/src/constants/features', () => ({
  get YC_OCR_ENABLED() {
    return featureState.YC_OCR_ENABLED;
  },
}));

vi.mock('@/src/services/ocr-api-service', () => ({
  recognizeImageViaApi: vi.fn(),
}));

vi.mock('expo-file-system', () => ({
  readAsStringAsync: vi.fn(async () => 'pdf-base64'),
}));

vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: vi.fn(async () => ({
    uri: 'file://cropped.jpg',
    base64: 'photo-base64',
    width: 800,
    height: 1000,
  })),
}));

describe('recognizePrescription', () => {
  beforeEach(() => {
    featureState.YC_OCR_ENABLED = true;
    vi.mocked(recognizeImageViaApi).mockReset();
  });

  it('parses pasted text without calling Vision', async () => {
    const outcome = await recognizePrescription({
      manualText: 'Препарат: Фексофенадин\nДозировка: 180 мг',
      photoUri: 'file://ignored.jpg',
    });
    expect(outcome.source).toBe('text');
    expect(outcome.parsed.drug).toContain('Фексофенадин');
    expect(recognizeImageViaApi).not.toHaveBeenCalled();
  });

  it('OCRs attached photo and parses fields', async () => {
    vi.mocked(recognizeImageViaApi).mockResolvedValue({
      ok: true,
      text: [
        'Препарат: Монтелукаст 10 мг',
        'Дозировка: 1 таблетка вечером',
        'Путь введения: Пероральный',
        'Дата начала: 2026-03-01',
        'Дата окончания: 2026-08-31',
        'Схема приёма: 1 таблетка 1 раз в сутки',
      ].join('\n'),
    });

    const outcome = await recognizePrescription({ photoUri: 'file://rx.jpg' });
    expect(outcome.source).toBe('photo');
    expect(outcome.parsed.drug).toContain('Монтелукаст');
    expect(outcome.parsed.route).toBe('oral');
    expect(recognizeImageViaApi).toHaveBeenCalledWith({
      imageBase64: 'photo-base64',
      mimeType: 'image/jpeg',
    });
  });

  it('OCRs attached PDF as application/pdf', async () => {
    vi.mocked(recognizeImageViaApi).mockResolvedValue({
      ok: true,
      text: 'Препарат: Будесонид\nДозировка: 2 вдоха',
    });

    const outcome = await recognizePrescription({ pdfUri: 'file://rx.pdf' });
    expect(outcome.source).toBe('pdf');
    expect(outcome.parsed.drug).toContain('Будесонид');
    expect(recognizeImageViaApi).toHaveBeenCalledWith({
      imageBase64: 'pdf-base64',
      mimeType: 'application/pdf',
    });
  });

  it('falls back to demo when Vision fails', async () => {
    vi.mocked(recognizeImageViaApi).mockResolvedValue({
      ok: false,
      error: 'OCR HTTP 503',
    });

    const outcome = await recognizePrescription({ photoUri: 'file://rx.jpg' });
    expect(outcome.source).toBe('demo');
    expect(outcome.hintCode).toBe('cloud_failed');
    expect(outcome.cloudError).toBe('OCR HTTP 503');
  });

  it('reports cloud_disabled when flag is off but media is attached', async () => {
    featureState.YC_OCR_ENABLED = false;
    const outcome = await recognizePrescription({ photoUri: 'file://rx.jpg' });
    expect(outcome.source).toBe('demo');
    expect(outcome.hintCode).toBe('cloud_disabled');
    expect(recognizeImageViaApi).not.toHaveBeenCalled();
  });
});
