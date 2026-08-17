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
  YC_SCAN_INTENT_LLM_ENABLED: false,
  YC_SEARCH_ENABLED: false,
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

  it('calls VL before OCR on product photo scans', async () => {
    const callOrder: string[] = [];
    mockRecognizeDishViaApi.mockImplementation(async () => {
      callOrder.push('vl');
      return {
        ok: true,
        result: {
          dishName: 'Оливье',
          ingredients: ['яйцо'],
          confidence: 'medium',
        },
        cached: false,
      };
    });
    mockRecognizeImageViaApi.mockImplementation(async () => {
      callOrder.push('ocr');
      return { ok: false, error: 'No text recognized', status: 422 };
    });

    const { scanFromOcr } = await import('./scanner-service');
    await scanFromOcr({
      mode: 'product',
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/jpeg',
      profile: { id: 'p1', allergies: '["egg"]' } as never,
    });

    expect(callOrder[0]).toBe('vl');
    expect(callOrder).toContain('ocr');
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

  it('merges VL and readable OCR into one verdict and writes history once', async () => {
    const { saveScanHistory } = await import('./scan-history-service');
    const labelText =
      'Состав: молоко, сахар, какао-масло, лецитин соевый, ванилин. Может содержать следы орехов.';
    mockRecognizeImageViaApi.mockResolvedValueOnce({
      ok: true,
      text: labelText,
    });
    mockRunSmartScan.mockResolvedValueOnce({
      verdict: 'осторожно',
      reason: 'Найдено молоко',
      matches: ['Молоко'],
      crossMatches: [],
      mode: 'product',
      level: 'high',
      source: 'ocr',
      productName: 'Оливье',
    });

    const { scanFromOcr } = await import('./scanner-service');
    const result = await scanFromOcr({
      mode: 'product',
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/jpeg',
      profile: { id: 'p1', allergies: '["milk"]' } as never,
    });

    expect(mockRecognizeDishViaApi).toHaveBeenCalled();
    expect(mockRecognizeImageViaApi).toHaveBeenCalled();
    expect(result.source).toBe('ocr');
    expect(result.evidence).toBe('vl_ocr');
    expect(result.dishVision?.dishName).toBe('Оливье');
    expect(mockRunSmartScan).toHaveBeenCalledTimes(1);
    expect(mockRunSmartScan).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringMatching(/молоко/i),
        productName: 'Оливье',
        source: 'ocr',
      }),
    );
    expect(mockRunSmartScan.mock.calls[0][0].text).toMatch(/яйцо|майонез|колбаса/i);
    expect(saveScanHistory).toHaveBeenCalledTimes(1);
  });

  it('analyzes short label OCR when VL says the photo is not a dish', async () => {
    mockRecognizeDishViaApi.mockResolvedValueOnce({
      ok: false,
      error: 'Invalid dish vision response',
      status: 502,
    });
    mockRecognizeImageViaApi.mockResolvedValueOnce({
      ok: true,
      text: 'Состав: молоко, сахар',
    });
    mockRunSmartScan.mockResolvedValueOnce({
      verdict: 'осторожно',
      reason: 'Найдено молоко',
      matches: ['Молоко'],
      crossMatches: [],
      mode: 'product',
      level: 'high',
      source: 'ocr',
      productName: 'Этикетка',
    });

    const { scanFromOcr } = await import('./scanner-service');
    const result = await scanFromOcr({
      mode: 'product',
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/jpeg',
      profile: { id: 'p1', allergies: '["milk"]' } as never,
    });

    expect(result.source).toBe('ocr');
    expect(result.ocr?.text).toMatch(/молоко/i);
    expect(result.ocr?.warnings.some((warning) => /частично/i.test(warning))).toBe(true);
    expect(mockRunSmartScan).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('молоко'),
        source: 'ocr',
      }),
    );
  });

  it('throws DishVisionScanError instead of empty analyzeText when vision fails and no OCR text', async () => {
    mockRecognizeDishViaApi.mockResolvedValueOnce({
      ok: false,
      error: 'Forbidden',
      status: 502,
      providerStatus: 403,
    });

    const { DishVisionScanError, scanFromOcr } = await import('./scanner-service');
    await expect(
      scanFromOcr({
        mode: 'product',
        imageBase64: 'aGVsbG8=',
        mimeType: 'image/jpeg',
        profile: { id: 'p1', allergies: '[]' } as never,
      }),
    ).rejects.toBeInstanceOf(DishVisionScanError);
    expect(mockRecognizeImageViaApi).toHaveBeenCalled();
    expect(mockRunSmartScan).not.toHaveBeenCalled();
  });

  it('throws ScanCloudAuthError when dish-vision returns 401', async () => {
    mockRecognizeDishViaApi.mockResolvedValueOnce({
      ok: false,
      error: 'Unauthorized',
      status: 401,
    });

    const { ScanCloudAuthError, scanFromOcr } = await import('./scanner-service');
    await expect(
      scanFromOcr({
        mode: 'product',
        imageBase64: 'aGVsbG8=',
        mimeType: 'image/jpeg',
        profile: { id: 'p1', allergies: '[]' } as never,
      }),
    ).rejects.toBeInstanceOf(ScanCloudAuthError);
    expect(mockRunSmartScan).not.toHaveBeenCalled();
  });

  it('throws ScanCloudAuthError when OCR returns 401 before label analysis', async () => {
    mockRecognizeDishViaApi.mockResolvedValueOnce({
      ok: true,
      result: {
        dishName: 'Ignored',
        ingredients: ['x'],
        confidence: 'low',
      },
    });
    // Force VL-first path to skip by making VL return null? Actually VL runs first.
    // For OCR 401 we need VL to succeed or fail soft, then OCR throws.
    // Simpler: VL fails non-auth, OCR 401.
    mockRecognizeDishViaApi.mockReset();
    mockRecognizeDishViaApi.mockResolvedValueOnce({
      ok: false,
      error: 'provider down',
      status: 502,
    });
    mockRecognizeImageViaApi.mockResolvedValueOnce({
      ok: false,
      error: 'Unauthorized',
      status: 401,
    });

    const { ScanCloudAuthError, scanFromOcr } = await import('./scanner-service');
    await expect(
      scanFromOcr({
        mode: 'product',
        imageBase64: 'aGVsbG8=',
        mimeType: 'image/jpeg',
        profile: { id: 'p1', allergies: '[]' } as never,
      }),
    ).rejects.toBeInstanceOf(ScanCloudAuthError);
  });

  it('falls back to demo OCR when cloud OCR outage and VL fails', async () => {
    mockRecognizeDishViaApi.mockResolvedValueOnce({
      ok: false,
      error: 'Dish vision provider unavailable',
      status: 502,
    });
    mockRecognizeImageViaApi.mockResolvedValueOnce({
      ok: false,
      error: 'OCR HTTP 503',
      status: 503,
    });
    mockRunSmartScan.mockResolvedValueOnce({
      verdict: 'ок',
      reason: 'Демо',
      matches: [],
      crossMatches: [],
      mode: 'product',
      level: 'low',
      source: 'ocr',
    });

    const { scanFromOcr } = await import('./scanner-service');
    const result = await scanFromOcr({
      mode: 'product',
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/jpeg',
      profile: { id: 'p1', allergies: '[]' } as never,
    });

    expect(result.source).toBe('ocr');
    expect(result.ocr?.warnings.some((w) => /демо/i.test(w))).toBe(true);
    expect(mockRunSmartScan).toHaveBeenCalled();
  });

  it('runs VL first for any photo, not only product mode', async () => {
    mockRecognizeImageViaApi.mockResolvedValueOnce({
      ok: true,
      text: 'Меню: паста карбонара, салат цезарь с курицей и пармезаном, суп дня',
    });
    mockRunSmartScan.mockResolvedValueOnce({
      verdict: 'ок',
      reason: 'Совпадений нет',
      matches: [],
      crossMatches: [],
      mode: 'menu',
      level: 'low',
      source: 'ocr',
    });

    const { scanFromOcr } = await import('./scanner-service');
    const result = await scanFromOcr({
      mode: 'menu',
      imageBase64: 'aGVsbG8=',
      mimeType: 'image/jpeg',
    });

    expect(mockRecognizeDishViaApi).toHaveBeenCalled();
    expect(mockRecognizeImageViaApi).toHaveBeenCalled();
    expect(result.dishVision?.dishName).toBe('Оливье');
    expect(result.evidence).toBe('vl_ocr');
  });
});
