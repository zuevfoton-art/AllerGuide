import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiaryEntry, Profile } from '@/src/types';

// The report service pulls in expo modules transitively, which read RN globals.
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

/**
 * Dish and product names are enriched from Open Food Facts, a publicly editable
 * catalogue, and land in diary entries via barcode/photo capture. The exported
 * report is written into a same-origin document with `document.write`, so any
 * markup that survives into the HTML would execute as script.
 */
const PAYLOAD = '<img src=x onerror="document.body.dataset.pwned=1">';

const profile: Profile = {
  id: 1,
  name: PAYLOAD,
  birthYear: 1990,
  type: 'self',
  allergies: '[]',
  allergyConfirmations: '{}',
  crossReactionAllergies: '[]',
} as Profile;

const diaryEntry: DiaryEntry = {
  id: 1,
  profileId: 1,
  type: 'Питание',
  details: `Съел ${PAYLOAD}`,
  createdAt: '2026-09-01T10:00:00.000Z',
} as DiaryEntry;

vi.mock('@/src/db/init', () => ({
  getDb: () => ({
    getFirstSync: <T>() => profile as T,
    getAllSync: <T>() => [diaryEntry] as T[],
  }),
}));

vi.mock('@/src/services/diary-attachment-service', () => ({
  listDiaryAttachments: () => [],
  readDiaryAttachmentAsDataUri: async () => null,
}));

vi.mock('@/src/services/analytics-service', () => ({ trackEvent: vi.fn() }));
vi.mock('expo-file-system/legacy', () => ({}));
vi.mock('expo', () => ({}));
vi.mock('expo-modules-core', () => ({
  EventEmitter: class {},
  NativeModule: class {},
  requireNativeModule: () => ({}),
  requireOptionalNativeModule: () => null,
}));
vi.mock('expo-constants', () => ({ default: { expoConfig: {}, easConfig: {} } }));
vi.mock('expo-notifications', () => ({
  getPermissionsAsync: async () => ({ status: 'denied' }),
  scheduleNotificationAsync: async () => '',
  cancelScheduledNotificationAsync: async () => {},
  setNotificationHandler: () => {},
  SchedulableTriggerInputTypes: {},
}));

async function renderReportHtml(blockIds: string[]): Promise<string> {
  const { generateDoctorReportPdf } = await import('./doctor-report-service');

  let captured = '';
  const win = {
    document: {
      write: (html: string) => {
        captured = html;
      },
      close: () => {},
    },
    print: () => {},
  };
  vi.stubGlobal('window', { open: () => win });

  await generateDoctorReportPdf({ profileId: 1, periodDays: 30, blockIds });
  return captured;
}

describe('doctor report HTML export', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('escapes the profile name in the report header', async () => {
    const html = await renderReportHtml(['timeline']);

    expect(html).toContain('<strong>Профиль:</strong>');
    expect(html).toContain('&lt;img src=x onerror=&quot;document.body.dataset.pwned=1&quot;&gt;');
    expect(html).not.toContain(PAYLOAD);
  });

  it('escapes third-party text carried in diary entries', async () => {
    const html = await renderReportHtml(['timeline', 'nutrition', 'scales', 'therapy']);

    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('onerror="document');
  });

  it('still renders the report structure and readable content', async () => {
    const html = await renderReportHtml(['timeline']);

    expect(html).toContain('<html>');
    expect(html).toContain('Хронология записей');
    // The payload survives as visible text rather than being dropped.
    expect(html).toContain('&lt;img src=x');
  });
});
