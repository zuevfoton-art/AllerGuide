import { Platform, Share } from 'react-native';
import {
  DOCTOR_REPORT_BLOCKS,
  DOCTOR_REPORT_DISCLAIMER,
  DOCTOR_REPORT_TITLE,
  computeAsitCompliance,
  computeFoodDrugSummary,
  computePefTrend,
  formatAsitReportSummary,
  formatFoodDrugReportSummary,
  formatDiaryDate,
  formatDiaryEntrySummary,
  formatPassportHtml,
  formatPassportText,
  formatTriggerContextReport,
  getConsolidatedFoodAvoidList,
  getDefaultReportBlockIds,
  getReportDiaryTypes,
  parseAllergies,
  type DoctorReportBlock,
} from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { getAsitCourse } from '@/src/services/asit-course-service';
import { getFoodDrugRegistry } from '@/src/services/food-drug-registry-service';
import { getEmergencyNumber, getProfileAge } from '@/src/services/sos-service';
import type { DiaryEntry, Profile } from '@/src/types';

export type DoctorReportOptions = {
  profileId: number;
  periodDays: 7 | 14 | 30;
  blockIds: string[];
};

function filterEntriesByPeriod(entries: DiaryEntry[], days: number): DiaryEntry[] {
  const cutoff = Date.now() - days * 86_400_000;
  return entries.filter((e) => new Date(e.createdAt).getTime() >= cutoff);
}

function renderScaleTrend(entries: DiaryEntry[]): string {
  const scaleEntries = entries.filter((e) => e.type === 'Шкала');
  if (!scaleEntries.length) return '<p style="color:#666;">Нет записей шкал за период.</p>';

  const byType = new Map<string, DiaryEntry>();
  for (const entry of scaleEntries) {
    try {
      const parsed = JSON.parse(entry.details) as { answers?: Record<string, string> };
      const scaleId = parsed?.answers?.scaleId ?? 'unknown';
      if (!byType.has(scaleId)) byType.set(scaleId, entry);
    } catch {
      // skip
    }
  }

  return [...byType.values()]
    .map((e) => {
      const summary = formatDiaryEntrySummary(e.type, e.details || '');
      return `<li>${summary} <small>(${formatDiaryDate(e.createdAt)})</small></li>`;
    })
    .join('');
}

function renderPefTrend(entries: DiaryEntry[]): string {
  const trend = computePefTrend(entries);
  if (!trend.count) return '<p style="color:#666;">Нет измерений ПСВ за период.</p>';
  return `<p>Измерений: ${trend.count}. Min: ${trend.min ?? '—'}, Max: ${trend.max ?? '—'}, последнее: ${trend.latest ?? '—'} л/мин${trend.latestAt ? ` (${formatDiaryDate(trend.latestAt)})` : ''}.</p>`;
}

function renderPassportSummary(profile: Profile): string {
  const passport = getAllergyPassport(profile.id);
  const allergies = parseAllergies(profile.allergies);
  const text = formatPassportText({
    profileName: profile.name,
    profileAge: profile.birthYear ? getProfileAge(profile.birthYear) : undefined,
    allergies,
    passport,
    emergencyNumber: getEmergencyNumber(),
  });
  return `<pre style="font-size:12px;white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:6px;">${text.replace(/</g, '&lt;')}</pre>`;
}

export async function generateDoctorReportPdf(options: DoctorReportOptions) {
  const db = getDb();
  const profile = db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [options.profileId]);
  const allEntries = db.getAllSync<DiaryEntry>(
    'SELECT * FROM diary_entries WHERE profileId = ? ORDER BY createdAt DESC',
    [options.profileId],
  );

  const periodEntries = filterEntriesByPeriod(allEntries, options.periodDays);
  const allowedTypes = getReportDiaryTypes(options.blockIds);
  const entries = periodEntries.filter((e) => allowedTypes.includes(e.type));

  const blocksHtml = DOCTOR_REPORT_BLOCKS.filter((b) => options.blockIds.includes(b.id))
    .map((block: DoctorReportBlock) => {
      const blockEntries = entries.filter((e) => block.diaryTypes.includes(e.type));
      if (!blockEntries.length) {
        return `<section><h2>${block.label}</h2><p style="color:#666;">Нет записей за период.</p></section>`;
      }
      return `<section><h2>${block.label}</h2>${blockEntries
        .map(
          (e) =>
            `<div style="margin-bottom:12px;border-left:3px solid #FF6B00;padding-left:10px;"><strong>${e.type}</strong><p>${formatDiaryEntrySummary(e.type, e.details || '')}</p><small>${formatDiaryDate(e.createdAt)}</small></div>`,
        )
        .join('')}</section>`;
    })
    .join('');

  const scalesHtml = options.blockIds.includes('scales')
    ? `<section><h2>Сводка шкал</h2><ul>${renderScaleTrend(periodEntries)}</ul></section>`
    : '';

  const asitHtml = options.blockIds.includes('asit')
    ? `<section><h2>Сводка АСИТ</h2><pre style="font-size:12px;white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:6px;">${formatAsitReportSummary(
        computeAsitCompliance(periodEntries, options.periodDays),
        getAsitCourse(options.profileId),
        options.periodDays,
      ).replace(/</g, '&lt;')}</pre></section>`
    : '';

  const foodDrugHtml = options.blockIds.includes('foodDrug') && profile
    ? `<section><h2>Пищевая и лекарственная аллергия</h2><pre style="font-size:12px;white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:6px;">${formatFoodDrugReportSummary(
        computeFoodDrugSummary(periodEntries, options.periodDays),
        {
          avoidFoods: getConsolidatedFoodAvoidList(
            parseAllergies(profile.allergies),
            getFoodDrugRegistry(options.profileId),
          ),
          drugIntolerances: getAllergyPassport(options.profileId).drugIntolerances,
          clinicalNotes: getFoodDrugRegistry(options.profileId)?.clinicalNotes,
          periodDays: options.periodDays,
        },
      ).replace(/</g, '&lt;')}</pre></section>`
    : '';

  const triggerContextHtml = options.blockIds.includes('triggerContext')
    ? `<section><h2>Контекст триггеров</h2><pre style="font-size:12px;white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:6px;">${formatTriggerContextReport(periodEntries).replace(/</g, '&lt;')}</pre></section>`
    : '';

  const pefHtml = options.blockIds.includes('peakflow')
    ? `<section><h2>Тренд ПСВ</h2>${renderPefTrend(periodEntries)}</section>`
    : '';

  const passportHtml = profile
    ? `<section><h2>Паспорт SOS</h2>${renderPassportSummary(profile)}</section>`
    : '';

  const html = `
    <html><body style="font-family: Helvetica, Arial, sans-serif; padding: 24px; color:#20322a;">
      <h1>Отчёт AllerGuide для врача</h1>
      <p style="font-size:13px;color:#FF6B00;font-weight:700;">${DOCTOR_REPORT_TITLE}</p>
      <p><strong>Профиль:</strong> ${profile?.name || 'Профиль'}</p>
      <p><strong>Год рождения:</strong> ${profile?.birthYear || ''}</p>
      <p><strong>Период:</strong> ${options.periodDays} дней</p>
      <p style="font-size:12px;color:#555;">${DOCTOR_REPORT_DISCLAIMER}</p>
      <hr />
      ${pefHtml}
      ${scalesHtml}
      ${asitHtml}
      ${foodDrugHtml}
      ${triggerContextHtml}
      ${blocksHtml}
      ${passportHtml}
      <hr />
      <p style="font-size:12px;color:#555;">Информация носит рекомендательный характер и не является медицинским заключением.</p>
    </body></html>`;

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
    return;
  }

  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
}

export async function exportPassportPdf(profile: Profile) {
  const passport = getAllergyPassport(profile.id);
  const allergies = parseAllergies(profile.allergies);
  const html = formatPassportHtml({
    profileName: profile.name,
    profileAge: profile.birthYear ? getProfileAge(profile.birthYear) : undefined,
    allergies,
    passport,
    emergencyNumber: getEmergencyNumber(),
  });

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
    return;
  }

  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
}

export async function sharePassportText(profile: Profile) {
  const passport = getAllergyPassport(profile.id);
  const allergies = parseAllergies(profile.allergies);
  const text = formatPassportText({
    profileName: profile.name,
    profileAge: profile.birthYear ? getProfileAge(profile.birthYear) : undefined,
    allergies,
    passport,
    emergencyNumber: getEmergencyNumber(),
  });

  await Share.share({ message: text, title: 'Паспорт аллергика' });
}

export { getDefaultReportBlockIds, DOCTOR_REPORT_BLOCKS };
