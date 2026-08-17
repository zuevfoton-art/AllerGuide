import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanHistoryEntry } from '@allerguide/core';

const mockRunSmartScan = vi.fn();
const mockGetBackendAuthToken = vi.fn();

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
  AI_DISH_VISION_ENABLED: false,
  YC_OCR_ENABLED: false,
}));

vi.mock('@/src/services/dish-vision-api-service', () => ({
  recognizeDishViaApi: vi.fn(async () => null),
}));

vi.mock('@/src/services/ocr-api-service', () => ({
  recognizeImageViaApi: vi.fn(async () => null),
}));

vi.mock('@/src/services/auth-service', () => ({
  getBackendAuthToken: () => mockGetBackendAuthToken(),
}));

const mockResolveProductByBarcode = vi.fn();
const mockSaveScanHistory = vi.fn();
const mockListScanHistory = vi.fn((): ScanHistoryEntry[] => []);

vi.mock('@/src/services/barcode-lookup-service', () => ({
  resolveProductByBarcode: mockResolveProductByBarcode,
}));

vi.mock('@/src/services/scan-history-service', () => ({
  saveScanHistory: mockSaveScanHistory,
  listScanHistory: mockListScanHistory,
}));

vi.mock('@/src/services/analytics-service', () => ({
  trackEvent: vi.fn(),
}));

describe('scanner-service AI scan auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBackendAuthToken.mockResolvedValue('jwt-token');
    mockRunSmartScan.mockResolvedValue({
      verdict: 'ok',
      reason: 'test',
      matches: [],
      crossMatches: [],
      mode: 'product',
      level: 'low',
      source: 'llm',
    });
  });

  it('passes backend JWT to runSmartScan when AI scan is enabled', async () => {
    const { scanText } = await import('./scanner-service');
    await scanText({ mode: 'product', text: 'молоко', profile: null });

    expect(mockGetBackendAuthToken).toHaveBeenCalled();
    expect(mockRunSmartScan).toHaveBeenCalledWith(
      expect.objectContaining({
        llmEndpoint: expect.stringContaining('/api/scan'),
        llmApiKey: 'jwt-token',
      }),
    );
  });

  it('stores the barcode as history input so repeat-risk can match later', async () => {
    mockListScanHistory.mockReturnValue([
      {
        id: 1,
        profileId: 7,
        mode: 'product',
        input: '4601234567890',
        verdict: 'осторожно',
        matches: '[]',
        level: 'high',
        productName: 'Йогурт',
        source: 'barcode',
        createdAt: new Date().toISOString(),
      },
    ]);
    mockResolveProductByBarcode.mockResolvedValue({
      name: 'Йогурт',
      ingredients: 'молоко, сахар',
      source: 'openfoodfacts',
      brand: 'Домик',
      imageUrl: null,
    });
    mockRunSmartScan.mockResolvedValue({
      verdict: 'осторожно',
      reason: 'молоко',
      matches: ['Молоко'],
      crossMatches: [],
      mode: 'product',
      level: 'high',
      source: 'openfoodfacts',
    });

    const { scanBarcode } = await import('./scanner-service');
    const result = await scanBarcode({
      barcode: '4601234567890',
      profile: {
        id: 7,
        name: 'Анна',
        birthYear: 1990,
        type: 'self',
        allergies: '["milk"]',
      },
    });

    expect(result.repeatUnsafe).toBe(true);
    expect(mockSaveScanHistory).toHaveBeenCalledWith(
      7,
      '4601234567890',
      expect.objectContaining({ level: 'high' }),
      'Йогурт',
      { composition: 'молоко, сахар' },
    );
  });

  it('does not call dish vision on a photo when the VL flag is off', async () => {
    const { recognizeDishViaApi } = await import('./dish-vision-api-service');
    mockRunSmartScan.mockResolvedValue({
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
      profile: null,
    });

    expect(recognizeDishViaApi).not.toHaveBeenCalled();
    expect(result.evidence).toBe('ocr');
    expect(result.dishVision).toBeUndefined();
  });

  it('parses a manual composition block and returns a profile match', async () => {
    mockRunSmartScan.mockResolvedValue({
      verdict: 'осторожно',
      reason: 'Найдено молоко',
      matches: ['Молоко'],
      crossMatches: [],
      mode: 'product',
      level: 'high',
      source: 'ocr',
    });

    const { scanFromOcr } = await import('./scanner-service');
    const result = await scanFromOcr({
      mode: 'product',
      ocrText: 'Состав: молоко, пшеничная мука, сахар',
      profile: {
        id: 7,
        name: 'Анна',
        birthYear: 1990,
        type: 'self',
        allergies: '["milk"]',
      },
    });

    expect(result.matches).toContain('Молоко');
    expect(result.ocr?.ingredientsBlock).toMatch(/молоко/i);
    expect(result.evidence).toBe('ocr');
    expect(mockRunSmartScan).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('молоко'),
        source: 'ocr',
      }),
    );
  });
});
