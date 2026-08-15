import type { DiaryAutoMetadata } from '@allerguide/core';
import { loadDiaryTriggerContext } from '@/src/services/diary-context-service';
import { findRecentFoodScanForProfile } from '@/src/services/diary-section-service';
import { fetchWellnessSnapshot } from '@/src/services/wellness-service';
import type { AppLocale } from '@/src/i18n/types';

export async function collectDiaryAutoMetadata(input: {
  profileId: number | null;
  profileAllergiesJson: string;
  locale: AppLocale;
}): Promise<DiaryAutoMetadata> {
  if (!input.profileId) return {};

  const wellness = await fetchWellnessSnapshot(
    input.profileAllergiesJson,
    [],
    input.locale,
  ).catch(() => null);
  const context = await loadDiaryTriggerContext(input.profileId, wellness?.factors);
  const scan = findRecentFoodScanForProfile(input.profileId);

  return {
    pollenContext: context.pollenSummary,
    recentScan: context.recentScanSummary,
    todayMeds: context.todayMedsSummary,
    scanRef: scan
      ? `${scan.productName}: ${scan.verdict} (${scan.level})`
      : undefined,
  };
}
