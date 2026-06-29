import {
  buildTriggerContext,
  buildTriggerPrefill,
  decodeDiaryDetails,
  type DiaryTriggerContext,
} from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { listScanHistory } from '@/src/services/scan-history-service';
import type { DiaryEntry } from '@/src/types';

export function getTodayDiaryEntries(profileId: number): DiaryEntry[] {
  const db = getDb();
  const entries = db.getAllSync<DiaryEntry>(
    'SELECT * FROM diary_entries WHERE profileId = ? ORDER BY createdAt DESC',
    [profileId],
  );
  const now = new Date();
  return entries.filter((entry) => {
    const date = new Date(entry.createdAt);
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  });
}

export function buildPollenSummaryFromFactors(
  factors: { label: string; value: string; level: 'low' | 'mid' | 'high' }[],
): string | undefined {
  const pollenFactors = factors.filter((f) => f.label.toLowerCase().includes('пыльц') || f.label.toLowerCase().includes('pollen'));
  const relevant = pollenFactors.filter((f) => f.level !== 'low');
  if (!relevant.length) return pollenFactors[0] ? `${pollenFactors[0].label}: ${pollenFactors[0].value}` : undefined;
  return relevant.map((f) => `${f.label.replace(/Пыльца\s*·\s*/i, '')}: ${f.value}`).join('; ');
}

export async function loadDiaryTriggerContext(
  profileId: number,
  pollenFactors?: { label: string; value: string; level: 'low' | 'mid' | 'high' }[],
): Promise<DiaryTriggerContext> {
  const scans = listScanHistory(profileId);
  const recentScan = scans[0];
  const todayEntries = getTodayDiaryEntries(profileId);

  return buildTriggerContext({
    pollenSummary: pollenFactors ? buildPollenSummaryFromFactors(pollenFactors) : undefined,
    recentScan: recentScan
      ? {
          productName: recentScan.productName,
          verdict: recentScan.verdict,
          level: recentScan.level,
          createdAt: recentScan.createdAt,
        }
      : undefined,
    todayMedicineEntries: todayEntries,
  });
}

export function getTriggerPrefillAnswers(context: DiaryTriggerContext): Record<string, string> {
  return buildTriggerPrefill(context);
}

export function getRecentScaleSummaries(profileId: number, limit = 5): string[] {
  const db = getDb();
  const entries = db.getAllSync<DiaryEntry>(
    'SELECT * FROM diary_entries WHERE profileId = ? AND type = ? ORDER BY createdAt DESC LIMIT ?',
    [profileId, 'Шкала', limit],
  );

  return entries.map((entry) => {
    const structured = decodeDiaryDetails(entry.details);
    const score = structured?.answers.scaleScore;
    const interpretation = structured?.answers.scaleInterpretation;
    const scaleId = structured?.answers.scaleId;
    if (score && interpretation) {
      return `${scaleId ?? 'Шкала'}: ${score} — ${interpretation}`;
    }
    return 'Шкала';
  });
}
