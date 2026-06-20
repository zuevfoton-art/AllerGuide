import {
  DOCTOR_REPORT_BLOCKS,
  DOCTOR_REPORT_DISCLAIMER,
  DOCTOR_REPORT_TITLE,
  formatDiaryDate,
  formatDiaryEntrySummary,
  getDefaultReportBlockIds,
  getReportDiaryTypes,
  type DoctorReportPeriod,
} from '@allerguide/core';
import { Platform } from 'react-native';
import { getDb } from '@/src/db/init';
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
    .map((block) => {
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

  const html = `
    <html><body style="font-family: Helvetica, Arial, sans-serif; padding: 24px; color:#20322a;">
      <h1>Отчёт AllerGuide для врача</h1>
      <p style="font-size:13px;color:#FF6B00;font-weight:700;">${DOCTOR_REPORT_TITLE}</p>
      <p><strong>Профиль:</strong> ${profile?.name || 'Профиль'}</p>
      <p><strong>Год рождения:</strong> ${profile?.birthYear || ''}</p>
      <p><strong>Период:</strong> ${options.periodDays} дней</p>
      <p style="font-size:12px;color:#555;">${DOCTOR_REPORT_DISCLAIMER}</p>
      <hr />
      ${blocksHtml}
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

export { getDefaultReportBlockIds, DOCTOR_REPORT_BLOCKS };
