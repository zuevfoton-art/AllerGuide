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
  formatAsthmaReportSummary,
  formatCodedAllergiesReportHtml,
  formatFoodDrugReportSummary,
  formatInsectReportSummary,
  formatPefTrendSummary,
  formatConditionHistoryReportText,
  formatClinicalPhenotypesReportText,
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
import { doctorReportPdfFooterRu, doctorReportTitleRu } from '@/src/constants/brand';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { getStoredConditionHistory } from '@/src/services/condition-history-service';
import { resolveProfileClinicalPhenotypes } from '@/src/services/clinical-phenotype-service';
import { getAsitCourse } from '@/src/services/asit-course-service';
import { getFoodDrugRegistry } from '@/src/services/food-drug-registry-service';
import { getInsectActionPlan } from '@/src/services/insect-action-plan-service';
import { getAsthmaActionPlan } from '@/src/services/asthma-action-plan-service';
import { getEmergencyNumber, getProfileAge } from '@/src/services/sos-service';
import { trackEvent } from '@/src/services/analytics-service';
import { logCaughtError } from '@/src/services/error-reporting';
import {
  listDiaryAttachments,
  readDiaryAttachmentAsDataUri,
} from '@/src/services/diary-attachment-service';
import type { DiaryEntry, Profile } from '@/src/types';

export type DoctorReportOptions = {
  profileId: number;
  periodDays?: 7 | 14 | 30;
  /** Inclusive ISO date `YYYY-MM-DD` for custom range. */
  fromDate?: string;
  toDate?: string;
  blockIds: string[];
};

function startOfDayMs(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00`).getTime();
}

function endOfDayMs(isoDate: string): number {
  return new Date(`${isoDate}T23:59:59.999`).getTime();
}

function filterEntriesByPeriod(
  entries: DiaryEntry[],
  options: Pick<DoctorReportOptions, 'periodDays' | 'fromDate' | 'toDate'>,
): DiaryEntry[] {
  if (options.fromDate && options.toDate) {
    const from = startOfDayMs(options.fromDate);
    const to = endOfDayMs(options.toDate);
    return entries.filter((e) => {
      const ts = new Date(e.createdAt).getTime();
      return ts >= from && ts <= to;
    });
  }
  const days = options.periodDays ?? 30;
  const cutoff = Date.now() - days * 86_400_000;
  return entries.filter((e) => new Date(e.createdAt).getTime() >= cutoff);
}

function formatPeriodLabel(options: DoctorReportOptions): string {
  if (options.fromDate && options.toDate) {
    return `${options.fromDate} — ${options.toDate}`;
  }
  return `${options.periodDays ?? 30} дней`;
}

/** Effective day span for summary helpers that still take periodDays. */
function resolvePeriodDays(options: DoctorReportOptions): number {
  if (options.fromDate && options.toDate) {
    const ms = endOfDayMs(options.toDate) - startOfDayMs(options.fromDate);
    return Math.max(1, Math.ceil(ms / 86_400_000));
  }
  return options.periodDays ?? 30;
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
    } catch (error) {
      logCaughtError('renderScaleTrend.parseEntry', error, { level: 'warn' });
    }
  }

  return [...byType.values()]
    .map((e) => {
      const summary = formatDiaryEntrySummary(e.type, e.details || '');
      return `<li>${summary} <small>(${formatDiaryDate(e.createdAt)})</small></li>`;
    })
    .join('');
}

function renderPefTrend(entries: DiaryEntry[], planPersonalBest?: string | null): string {
  const trend = computePefTrend(entries, { planPersonalBest });
  if (!trend.count) return `<p style="color:${c.muted};">Нет измерений ПСВ за период.</p>`;
  return `<p>${formatPefTrendSummary(trend).replace(/</g, '&lt;')}</p>`;
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

  const periodEntries = filterEntriesByPeriod(allEntries, options);
  const periodDays = resolvePeriodDays(options);
  const allowedTypes = getReportDiaryTypes(options.blockIds);
  const entries = periodEntries.filter((e) => allowedTypes.includes(e.type));

  const blocksHtml = (
    await Promise.all(
      DOCTOR_REPORT_BLOCKS.filter((b) => options.blockIds.includes(b.id)).map(async (block: DoctorReportBlock) => {
        const blockEntries = entries.filter((e) => block.diaryTypes.includes(e.type));
        if (!blockEntries.length) {
          return `<section><h2>${block.label}</h2><p style="color:${c.muted};">Нет записей за период.</p></section>`;
        }
        const itemsHtml = (
          await Promise.all(
            blockEntries.map(async (e) => {
              const summary = formatDiaryEntrySummary(e.type, e.details || '');
              let photosHtml = '';
              if (block.id === 'skin' || e.type === 'Кожа') {
                const attachments = listDiaryAttachments(e.id);
                const dataUris = (
                  await Promise.all(attachments.map((a) => readDiaryAttachmentAsDataUri(a.localPath)))
                ).filter((uri): uri is string => Boolean(uri));
                if (dataUris.length) {
                  photosHtml = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">${dataUris
                    .map(
                      (uri) =>
                        `<img src="${uri}" alt="skin" style="max-width:180px;max-height:180px;border-radius:8px;border:1px solid ${c.border};object-fit:cover;" />`,
                    )
                    .join('')}</div>`;
                }
              }
              return `<div style="margin-bottom:12px;border-left:3px solid ${c.accent};padding-left:10px;"><strong>${e.type}</strong><p>${summary}</p>${photosHtml}<small>${formatDiaryDate(e.createdAt)}</small></div>`;
            }),
          )
        ).join('');
        return `<section><h2>${block.label}</h2>${itemsHtml}</section>`;
      }),
    )
  ).join('');

  const timelineHtml = options.blockIds.includes('timeline')
    ? `<section><h2>Хронология записей</h2>${renderTimeline(periodEntries)}</section>`
    : '';

  const conditionPhenotypesHtml =
    options.blockIds.includes('conditionPhenotypes') && profile
      ? (() => {
          const history = getStoredConditionHistory(profile.id);
          const phenotypes = resolveProfileClinicalPhenotypes(profile);
          const historyText = formatConditionHistoryReportText(history);
          const phenotypeText = formatClinicalPhenotypesReportText(phenotypes);
          const body = `${historyText}\n\n---\n\n${phenotypeText}`.replace(/</g, '&lt;');
          return `<section><h2>Хронология и фенотипы профиля</h2><pre style="font-size:12px;white-space:pre-wrap;background:${c.bg};padding:12px;border-radius:8px;border:1px solid ${c.border};">${body}</pre></section>`;
        })()
      : '';

  const scalesHtml = options.blockIds.includes('scales')
    ? `<section><h2>Сводка шкал</h2><ul>${renderScaleTrend(periodEntries)}</ul></section>`
    : '';

  const asitHtml = options.blockIds.includes('asit')
    ? `<section><h2>Сводка АСИТ</h2><pre style="font-size:12px;white-space:pre-wrap;background:${c.bg};padding:12px;border-radius:8px;border:1px solid ${c.border};">${formatAsitReportSummary(
        computeAsitCompliance(periodEntries, periodDays),
        getAsitCourse(options.profileId),
        periodDays,
      ).replace(/</g, '&lt;')}</pre></section>`
    : '';

  const foodDrugHtml = options.blockIds.includes('foodDrug') && profile
    ? `<section><h2>Пищевая и лекарственная аллергия</h2><pre style="font-size:12px;white-space:pre-wrap;background:${c.bg};padding:12px;border-radius:8px;border:1px solid ${c.border};">${formatFoodDrugReportSummary(
        computeFoodDrugSummary(periodEntries, periodDays),
        {
          avoidFoods: getConsolidatedFoodAvoidList(
            parseAllergies(profile.allergies),
            getFoodDrugRegistry(options.profileId),
          ),
          drugIntolerances: getAllergyPassport(options.profileId).drugIntolerances,
          clinicalNotes: getFoodDrugRegistry(options.profileId)?.clinicalNotes,
          periodDays: periodDays,
        },
      ).replace(/</g, '&lt;')}</pre></section>`
    : '';

  const insectPlan = getInsectActionPlan(options.profileId);
  const insectHtml =
    options.blockIds.includes('insect') && profile
      ? `<section><h2>Инсектная аллергия</h2><pre style="font-size:12px;white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:6px;">${formatInsectReportSummary(
          computeInsectStingSummary(periodEntries, periodDays),
          {
            knownInsects: getConsolidatedInsectList(parseAllergies(profile.allergies), insectPlan),
            adrenalineLocation: insectPlan?.adrenalineLocation,
            emergencySteps: insectPlan?.emergencySteps,
            clinicalNotes: insectPlan?.clinicalNotes,
            periodDays: periodDays,
          },
        ).replace(/</g, '&lt;')}</pre></section>`
      : '';

  const asthmaPlan = getAsthmaActionPlan(options.profileId);
  const pefTrend = computePefTrend(periodEntries, { planPersonalBest: asthmaPlan?.personalBestPef });
  const asthmaHtml =
    options.blockIds.includes('asthma') && profile
      ? `<section><h2>Бронхиальная астма</h2><pre style="font-size:12px;white-space:pre-wrap;background:#f8f8f8;padding:12px;border-radius:6px;">${formatAsthmaReportSummary(
          {
            count: pefTrend.count,
            latest: pefTrend.latest,
            personalBest: pefTrend.personalBest,
            latestZone: pefTrend.latestZone
              ? { green: 'Зелёная зона', yellow: 'Жёлтая зона', red: 'Красная зона' }[pefTrend.latestZone]
              : null,
            latestPercentOfBest: pefTrend.latestPercentOfBest,
          },
          asthmaPlan,
          { periodDays: periodDays },
        ).replace(/</g, '&lt;')}</pre></section>`
      : '';

  const triggerContextHtml = options.blockIds.includes('triggerContext')
    ? `<section><h2>Контекст триггеров</h2><pre style="font-size:12px;white-space:pre-wrap;background:${c.bg};padding:12px;border-radius:8px;border:1px solid ${c.border};">${formatTriggerContextReport(periodEntries).replace(/</g, '&lt;')}</pre></section>`
    : '';

  const pefHtml = options.blockIds.includes('peakflow')
    ? `<section><h2>Тренд ПСВ</h2>${renderPefTrend(periodEntries, asthmaPlan?.personalBestPef)}</section>`
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
      <h1 style="color:${c.head};font-family: 'Source Serif 4', Georgia, serif;">${doctorReportTitleRu()}</h1>
      <p style="font-size:13px;color:${c.head};font-weight:700;">${DOCTOR_REPORT_TITLE}</p>
      <p><strong>Профиль:</strong> ${profile?.name || 'Профиль'}</p>
      <p><strong>Год рождения:</strong> ${profile?.birthYear || ''}</p>
      <p><strong>Период:</strong> ${formatPeriodLabel(options)}</p>
      <p style="font-size:12px;color:${c.muted};">${DOCTOR_REPORT_DISCLAIMER}</p>
      <hr style="border:none;border-top:1px solid ${c.border};" />
      ${pefHtml}
      ${asthmaHtml}
      ${timelineHtml}
      ${conditionPhenotypesHtml}
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
      <p style="font-size:11px;color:${c.muted};">${doctorReportPdfFooterRu()}</p>
    </body></html>`;

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
    trackEvent('diary_report_exported', { period_days: periodDays, platform: 'web' });
    return;
  }

  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  trackEvent('diary_report_exported', { period_days: periodDays, platform: Platform.OS });
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
