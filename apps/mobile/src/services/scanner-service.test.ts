import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRunSmartScan = vi.fn();
const mockGetBackendAuthToken = vi.fn();

vi.mock('@allerguide/ai', () => ({
  runSmartScan: (...args: unknown[]) => mockRunSmartScan(...args),
  buildOcrScanProductName: vi.fn(),
  prepareScanTextFromOcr: vi.fn(),
  simulateOcrFromCapture: vi.fn(),
}));

vi.mock('@/src/constants/features', () => ({ AI_SCAN_ENABLED: true }));

vi.mock('@/src/services/auth-service', () => ({
  getBackendAuthToken: () => mockGetBackendAuthToken(),
}));

vi.mock('@/src/services/barcode-lookup-service', () => ({
  resolveProductByBarcode: vi.fn(),
}));

vi.mock('@/src/services/scan-history-service', () => ({
  saveScanHistory: vi.fn(),
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
});
