import { formatDiaryEntrySummary } from './diary';
import { buildCodedSymptomLines, resolveSymptomCodes } from './symptom-coding';
import { decodeDiaryDetails } from './diary-codec';
import { normalizeSeverity, formatSeveritySummary } from './diary-severity';
import type { DiaryEntry } from './types';

export interface DoctorReportTimelineItem {
  createdAt: string;
  type: string;
  summary: string;
  severityLabel: string | null;
  codedSymptoms: string | null;
}

export function buildDoctorReportTimeline(
  entries: Pick<DiaryEntry, 'type' | 'details' | 'createdAt'>[],
): DoctorReportTimelineItem[] {
  return [...entries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((entry) => {
      const payload = decodeDiaryDetails(entry.details);
      const answers = payload?.answers ?? {};
      const severity = normalizeSeverity(answers, entry.type);
      const codes =
        entry.type === 'Симптомы' ? resolveSymptomCodes(answers) : [];
      const coded =
        codes.length > 0
          ? buildCodedSymptomLines(codes)
              .map((c) => `${c.labelRu} [SNOMED ${c.snomed}]`)
              .join('; ')
          : null;

      return {
        createdAt: entry.createdAt,
        type: entry.type,
        summary: formatDiaryEntrySummary(entry.type, entry.details),
        severityLabel: severity !== null ? formatSeveritySummary(severity) : null,
        codedSymptoms: coded,
      };
    });
}

export function formatDoctorReportTimelineText(items: DoctorReportTimelineItem[]): string {
  if (!items.length) return 'Нет записей за период.';
  return items
    .map((item) => {
      const parts = [`[${item.type}] ${item.summary}`];
      if (item.severityLabel) parts.push(`тяжесть: ${item.severityLabel}`);
      if (item.codedSymptoms) parts.push(`коды: ${item.codedSymptoms}`);
      return parts.join(' · ');
    })
    .join('\n');
}
