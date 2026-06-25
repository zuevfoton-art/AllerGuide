import { Platform, Share } from 'react-native';
import {
  DOCTOR_REPORT_BLOCKS,
  DOCTOR_REPORT_DISCLAIMER,
  DOCTOR_REPORT_TITLE,
  buildCodedAllergyLines,
  buildDoctorReportTimeline,
  computeAsitCompliance,
  computeFoodDrugSummary,
  computeInsectStingSummary,
  computePefTrend,
  formatAsitReportSummary,
  formatCodedAllergiesReportHtml,
  formatFoodDrugReportSummary,
  formatInsectReportSummary,
  formatDiaryDate,
  formatDiaryEntrySummary,
  formatPassportHtml,
  formatPassportText,
  formatTriggerContextReport,
  getConsolidatedFoodAvoidList,
  getConsolidatedInsectList,
  getDefaultReportBlockIds,
  getReportDiaryTypes,
  parseAllergies,
  parseAllergyConfirmations,
  parseProfileAllergenIds,
  type DoctorReportBlock,
} from '@allerguide/core';
import { getDb } from '@/src/db/init';
import { brandReportColors as c } from '@/src/constants/layout';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { getAsitCourse } from '@/src/services/asit-course-service';
import { getFoodDrugRegistry } from '@/src/services/food-drug-registry-service';
import { getInsectActionPlan } from '@/src/services/insect-action-plan-service';
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

function renderTimeline(entries: DiaryEntry[]): string {
  const items = buildDoctorReportTimeline(entries);
  if (!items.length) return `<p style="color:${c.muted};">Нет записей за период.</p>`;
  return items
    .map((item) => {
      const severity = item.severityLabel ? ` · тяжесть: ${item.severityLabel}` : '';
      const coded = item.codedSymptoms ? `<br/><small>Коды: ${item.codedSymptoms}</small>` : '';
      return `<div style="margin-bottom:10px;border-left:3px solid ${c.accent};padding-left:10px;"><strong>${item.type}</strong> <small>(${formatDiaryDate(item.createdAt)})</small><p>${item.summary}${severity}</p>${coded}</div>`;
    })
    .join('');
}

function renderScaleTrend(entries: DiaryEntry[]): string {
  const scaleEntries = entries.filter((e) => e.type === 'Шкала');
  if (!scaleEntries.length) return `<p style="color:${c.muted};">Нет записей шкал за период.</p>`;

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
  if (!trend.count) return `<p style="color:${c.muted};">Нет измерений ПСВ за период.</p>`;
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
  return `<pre style="font-size:12px;white-space:pre-wrap;background:${c.bg};padding:12px;border-radius:8px;border:1px solid ${c.border};">${text.replace(/</g, '&lt;')}</pre>`;
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
        return `<section><h2>${block.label}</h2><p style="color:${c.muted};">Нет записей за период.</p></section>`;
      }
      return `<section><h2>${block.label}</h2>${blockEntries
        .map(
          (e) =>
            `<div style="margin-bottom:12px;border-left:3px solid ${c.accent};padding-left:10px;"><strong>${e.type}</strong><p>${formatDiaryEntrySummary(e.type, e.details || '')}</p><small>${formatDiaryDate(e.createdAt)}</small></div>`,
        )
        .join('')}</section>`;
    })
    .join('');

  const timelineHtml = options.blockIds.includes('timeline')
    ? `<section><h2>Хронология записей</h2>${renderTimeline(periodEntries)}</section>`
    : '';

  const scalesHtml = options.blockIds.includes('scales')
    ? `<section><h2>Сводка шкал</h2><ul>${renderScaleTrend(periodEntries)}</ul></section>`
    : '';

  const asitHtml = options.blockIds.includes('asit')
    ? `<section><h2>Сводка АСИТ</h2><pre style="font-size:12px;white-space:pre-wrap;background:${c.bg};padding:12px;border-radius:8px;border:1px solid ${c.border};">${formatAsitReportSummary(
        computeAsitCompliance(periodEntries, options.periodDays),
        getAsitCourse(options.profileId),
        options.periodDays,
      ).replace(/</g, '&lt;')}</pre></section>`
    : '';

  const foodDrugHtml = options.blockIds.includes('foodDrug') && profile
    ? `<section><h2>Пищевая и лекарственная аллергия</h2><pre style="font-size:12px;white-space:pre-wrap;background:${c.bg};padding:12px;border-radius:8px;border:1px solid ${c.border};">${formatFoodDrugReportSummary(
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

  const insectPlan = getInsectActionPlan(options.profileId);
  const insectHtml =
    options.blockIds.includes('insect') && profile
      ? `<section><h2>Инсектная аллергия</h2><pre style="font-size:12px;white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:6px;">${formatInsectReportSummary(
          computeInsectStingSummary(periodEntries, options.periodDays),
          {
            knownInsects: getConsolidatedInsectList(parseAllergies(profile.allergies), insectPlan),
            adrenalineLocation: insectPlan?.adrenalineLocation,
            emergencySteps: insectPlan?.emergencySteps,
            clinicalNotes: insectPlan?.clinicalNotes,
            periodDays: options.periodDays,
          },
        ).replace(/</g, '&lt;')}</pre></section>`
      : '';

  const triggerContextHtml = options.blockIds.includes('triggerContext')
    ? `<section><h2>Контекст триггеров</h2><pre style="font-size:12px;white-space:pre-wrap;background:${c.bg};padding:12px;border-radius:8px;border:1px solid ${c.border};">${formatTriggerContextReport(periodEntries).replace(/</g, '&lt;')}</pre></section>`
    : '';

  const pefHtml = options.blockIds.includes('peakflow')
    ? `<section><h2>Тренд ПСВ</h2>${renderPefTrend(periodEntries)}</section>`
    : '';

  const passportHtml = profile
    ? `<section><h2>Паспорт SOS</h2>${renderPassportSummary(profile)}</section>`
    : '';

  const codedAllergiesHtml = profile
    ? `<section><h2>Кодированные аллергены (ICD-11 / SNOMED)</h2>${formatCodedAllergiesReportHtml(
        buildCodedAllergyLines(
          parseProfileAllergenIds(profile.allergies),
          parseAllergyConfirmations(profile.allergyConfirmations),
        ),
      )}</section>`
    : '';

  const html = `
    <html><body style="font-family: Inter, Helvetica, Arial, sans-serif; padding: 24px; color:${c.text};">
      <h1 style="color:${c.head};font-family: 'Source Serif 4', Georgia, serif;">Отчёт AllerGuide для врача</h1>
      <p style="font-size:13px;color:${c.head};font-weight:700;">${DOCTOR_REPORT_TITLE}</p>
      <p><strong>Профиль:</strong> ${profile?.name || 'Профиль'}</p>
      <p><strong>Год рождения:</strong> ${profile?.birthYear || ''}</p>
      <p><strong>Период:</strong> ${options.periodDays} дней</p>
      <p style="font-size:12px;color:${c.muted};">${DOCTOR_REPORT_DISCLAIMER}</p>
      <hr style="border:none;border-top:1px solid ${c.border};" />
      ${pefHtml}
      ${timelineHtml}
      ${scalesHtml}
      ${asitHtml}
      ${foodDrugHtml}
      ${insectHtml}
      ${triggerContextHtml}
      ${codedAllergiesHtml}
      ${blocksHtml}
      ${passportHtml}
      <hr style="border:none;border-top:1px solid ${c.border};" />
      <p style="font-size:12px;color:${c.muted};">Информация носит рекомендательный характер и не является медицинским заключением.</p>
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
