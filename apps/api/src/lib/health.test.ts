import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

vi.mock('postgres', () => {
  const sql = vi.fn(async () => [{ '?column?': 1 }]);
  const factory = vi.fn(() => {
    const client = Object.assign(sql, {
      end: vi.fn(async () => undefined),
    });
    return client;
  });
  return { default: factory };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
});

describe('buildHealthPayload', () => {
  it('requires JWT when DATABASE_URL is configured', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    delete process.env.JWT_SECRET;

    const { buildHealthPayload } = await import('./health');
    const payload = await buildHealthPayload();
    expect(payload.ok).toBe(false);
    expect(payload.authDatabase).toBe(false);
  });
});
