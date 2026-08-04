import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRunSmartScan = vi.fn();
const mockRecognizeDishViaApi = vi.fn();
const mockLookupDish = vi.fn();
const mockClassifyIntentApi = vi.fn();
const mockRecognizeImageViaApi = vi.fn();

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@allerguide/ai', async () => {
  const actual = await vi.importActual<typeof import('@allerguide/ai')>('@allerguide/ai');
  return {
    ...actual,
    runSmartScan: (...args: unknown[]) => mockRunSmartScan(...args),
  };
});

vi.mock('@/src/constants/features', () => ({
  AI_SCAN_ENABLED: true,
  AI_DISH_VISION_ENABLED: true,
  YC_OCR_ENABLED: true,
}));

vi.mock('@/src/services/dish-vision-api-service', () => ({
  recognizeDishViaApi: (...args: unknown[]) => mockRecognizeDishViaApi(...args),
}));

vi.mock('@/src/services/ocr-api-service', () => ({
  recognizeImageViaApi: (...args: unknown[]) => mockRecognizeImageViaApi(...args),
}));

vi.mock('@/src/services/scan-intent-api-service', () => ({
  classifyScanIntentViaApi: (...args: unknown[]) => mockClassifyIntentApi(...args),
}));

vi.mock('@/src/services/scanner-dish-lookup-service', () => ({
  lookupDishIngredientsForScan: (...args: unknown[]) => mockLookupDish(...args),
}));

vi.mock('@/src/services/auth-service', () => ({
  getBackendAuthToken: vi.fn(async () => 'jwt'),
}));

vi.mock('@/src/services/scan-history-service', () => ({
  saveScanHistory: vi.fn(),
  listScanHistory: vi.fn(() => []),
}));

vi.mock('@/src/services/analytics-service', () => ({
  trackEvent: vi.fn(),
}));

describe('scanner dish vision (Option D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClassifyIntentApi.mockResolvedValue(null);
    mockLookupDish.mockResolvedValue(null);
    mockRecognizeImageViaApi.mockResolvedValue({
      ok: false,
      error: 'No text recognized',
      status: 422,
    });
    mockRecognizeDishViaApi.mockResolvedValue({
      ok: true,
      result: {
        dishName: 'Оливье',
        ingredients: ['картофель', 'яйцо', 'майонез', 'колбаса'],
        confidence: 'medium',
        notes: 'Оценка по виду',
      },
      cached: false,
    });
    mockRunSmartScan.mockResolvedValue({
      verdict: 'осторожно',
      reason: 'Найдено яйцо',
      matches: ['Яйцо'],
      crossMatches: [],
      mode: 'product',
      level: 'high',
      source: 'dish_vision',
      productName: 'Оливье',
    });
  });

  it('uses multimodal dish vision when OCR has no text', async () => {
    const { scanFromOcr } = await import('./scanner-service');
    const result = await scanFromOcr({
      mode: 'product',
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/jpeg',
      profile: { id: 'p1', allergies: '["egg"]' } as never,
    });

    expect(mockRecognizeDishViaApi).toHaveBeenCalled();
    expect(mockRunSmartScan).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('яйцо'),
        productName: 'Оливье',
        source: 'dish_vision',
      }),
    );
    expect(result.source).toBe('dish_vision');
    expect(result.dishVision?.dishName).toBe('Оливье');
    expect(result.reason).toMatch(/не лабораторный анализ/i);
  });
});
