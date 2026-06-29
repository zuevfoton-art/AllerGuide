/** Unified clinical severity scale 0–3 (C.2). */
export type Severity0_3 = 0 | 1 | 2 | 3;

export const SEVERITY_0_3_CHOICES = [
  '0 — нет',
  '1 — лёгкая',
  '2 — умеренная',
  '3 — сильная',
] as const;

export const SEVERITY_0_3_LABELS: Record<Severity0_3, string> = {
  0: 'Нет',
  1: 'Лёгкая',
  2: 'Умеренная',
  3: 'Сильная',
};

const MILD_MODERATE_SEVERE_MAP: Record<string, Severity0_3> = {
  нет: 0,
  'нет реакции': 0,
  '0 — нет': 0,
  лёгкая: 1,
  легкая: 1,
  '1 — лёгкая': 1,
  умеренная: 2,
  '2 — умеренная': 2,
  сильная: 3,
  '3 — сильная': 3,
  тяжёлая: 3,
  тяжелая: 3,
};

export function parseSeverity0_3(value: string | undefined): Severity0_3 | null {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d)/);
  if (match) {
    const num = Number(match[1]);
    if (num >= 0 && num <= 3) return num as Severity0_3;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized in MILD_MODERATE_SEVERE_MAP) {
    return MILD_MODERATE_SEVERE_MAP[normalized];
  }
  return null;
}

/** Map legacy 0–10 VAS intensity to unified 0–3. */
export function severityFromIntensity10(value: string | undefined): Severity0_3 | null {
  const match = value?.trim().match(/^(\d+)/);
  if (!match) return null;
  const num = Number(match[1]);
  if (!Number.isFinite(num) || num < 0) return null;
  if (num === 0) return 0;
  if (num <= 3) return 1;
  if (num <= 6) return 2;
  return 3;
}

export function normalizeSeverity(
  answers: Record<string, string>,
  sectionType: string,
): Severity0_3 | null {
  const direct = parseSeverity0_3(answers.severity);
  if (direct !== null) return direct;

  if (sectionType === 'Симптомы') {
    const fromSeverityField = parseSeverity0_3(answers.severity0_3);
    if (fromSeverityField !== null) return fromSeverityField;
    return severityFromIntensity10(answers.intensity);
  }

  const mildFields: Record<string, string | undefined> = {
    Лекарство: answers.sideEffectSeverity,
    Питание: answers.reaction,
    Кожа: answers.itching,
    АСИТ: answers.asitReaction,
    'Укус насекомого': answers.stingSeverity,
  };

  const raw = mildFields[sectionType];
  if (raw) {
    const parsed = parseSeverity0_3(raw);
    if (parsed !== null) return parsed;
    const lower = raw.trim().toLowerCase();
    if (lower in MILD_MODERATE_SEVERE_MAP) return MILD_MODERATE_SEVERE_MAP[lower];
    if (lower.includes('анафилакс')) return 3;
  }

  return null;
}

export function enrichSeverityAnswers(
  answers: Record<string, string>,
  sectionType: string,
): Record<string, string> {
  const severity = normalizeSeverity(answers, sectionType);
  if (severity === null) return answers;
  return {
    ...answers,
    severity: String(severity),
    severityLabel: SEVERITY_0_3_LABELS[severity],
  };
}

export function formatSeveritySummary(severity: Severity0_3 | null): string {
  if (severity === null) return '';
  return SEVERITY_0_3_LABELS[severity];
}
