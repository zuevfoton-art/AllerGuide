import { Platform } from 'react-native';
import { getDb } from '@/src/db/init';
import { brandReportColors as c } from '@/src/constants/layout';
import { formatDiaryDate, formatDiaryEntrySummary, getDiaryEntryAnswers } from '@allerguide/core';
import type { DiaryEntry, Profile } from '@/src/types';

export async function addDiaryEntry(input: {
  profileId: number;
  type: string;
  details: string;
  createdAt: string;
}) {
  const db = getDb();
  db.runSync('INSERT INTO diary_entries (profileId, type, details, createdAt) VALUES (?, ?, ?, ?)', [
    input.profileId,
    input.type,
    input.details,
    input.createdAt,
  ]);
}

export async function addDiaryEntries(
  profileId: number,
  entries: { type: string; details: string }[],
  createdAt = new Date().toISOString(),
) {
  for (const entry of entries) {
    await addDiaryEntry({ profileId, type: entry.type, details: entry.details, createdAt });
  }
}

export async function getDiaryEntries(profileId: number) {
  const db = getDb();
  return db.getAllSync<DiaryEntry>('SELECT * FROM diary_entries WHERE profileId = ? ORDER BY id DESC', [profileId]);
}

export async function updateDiaryEntry(
  id: number,
  input: { type: string; details: string },
) {
  const db = getDb();
  db.runSync('UPDATE diary_entries SET type = ?, details = ? WHERE id = ?', [
    input.type,
    input.details,
    id,
  ]);
}

export function getLastDiaryAnswers(
  profileId: number,
  type: string,
): Record<string, string> | null {
  const db = getDb();
  const entries = db.getAllSync<DiaryEntry>(
    'SELECT * FROM diary_entries WHERE profileId = ? ORDER BY id DESC',
    [profileId],
  );
  const match = entries.find((e) => e.type === type);
  if (!match) return null;
  return getDiaryEntryAnswers(type, match.details);
}

export async function deleteDiaryEntry(id: number) {
  const db = getDb();
  db.runSync('DELETE FROM diary_entries WHERE id = ?', [id]);
}

export function listAllDiaryEntries(): DiaryEntry[] {
  const db = getDb();
  return db.getAllSync<DiaryEntry>('SELECT * FROM diary_entries ORDER BY id DESC', []);
}

export async function generateDoctorPdf(profileId: number) {
  const db = getDb();
  const profile = db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [profileId]);
  const entries = db.getAllSync<DiaryEntry>('SELECT * FROM diary_entries WHERE profileId = ? ORDER BY createdAt DESC', [profileId]);
  const html = `
    <html><body style="font-family: Inter, Helvetica, Arial, sans-serif; padding: 24px; color:${c.text};">
      <h1 style="color:${c.head};font-family: 'Source Serif 4', Georgia, serif;">Отчёт AllerGuide для врача</h1>
      <p><strong>Профиль:</strong> ${profile?.name || 'Профиль'}</p>
      <p><strong>Год рождения:</strong> ${profile?.birthYear || ''}</p>
      <p style="font-size:12px;color:${c.muted};">Отчёт сформирован пользователем/родителем на основе самостоятельно введённых данных и не является медицинской документацией.</p>
      <hr style="border:none;border-top:1px solid ${c.border};" />
      ${entries
        .map((e) => {
          const summary = formatDiaryEntrySummary(e.type, e.details || '');
          return `<div style="margin-bottom:12px;"><h3>${e.type}</h3><p>${summary}</p><small>${formatDiaryDate(e.createdAt)}</small></div>`;
        })
        .join('')}
      <hr style="border:none;border-top:1px solid ${c.border};" />
      <p style="font-size:12px;color:${c.muted};">Информация в приложении носит рекомендательный и справочный характер и не является медицинским заключением, диагнозом или назначением лечения.</p>
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
