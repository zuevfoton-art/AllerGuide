import { parsePefNumeric } from './pef-zones';

export interface AsthmaActionPlan {
  v: 1;
  personalBestPef: string;
  relieverMedication: string;
  controllerNotes: string;
  yellowZoneSteps: string;
  redZoneSteps: string;
  clinicalNotes: string;
}

export const ASTHMA_ACTION_PLAN_DISCLAIMER =
  'План действий при астме носит информационный характер. Схему лечения и пороги определяет лечащий врач.';

export function createDefaultAsthmaActionPlan(): AsthmaActionPlan {
  return {
    v: 1,
    personalBestPef: '',
    relieverMedication: '',
    controllerNotes: '',
    yellowZoneSteps: '',
    redZoneSteps: '',
    clinicalNotes: '',
  };
}

export function parseAsthmaActionPlan(raw: string | null | undefined): AsthmaActionPlan | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as AsthmaActionPlan;
    if (parsed?.v !== 1) return null;
    return {
      v: 1,
      personalBestPef: typeof parsed.personalBestPef === 'string' ? parsed.personalBestPef : '',
      relieverMedication: typeof parsed.relieverMedication === 'string' ? parsed.relieverMedication : '',
      controllerNotes: typeof parsed.controllerNotes === 'string' ? parsed.controllerNotes : '',
      yellowZoneSteps: typeof parsed.yellowZoneSteps === 'string' ? parsed.yellowZoneSteps : '',
      redZoneSteps: typeof parsed.redZoneSteps === 'string' ? parsed.redZoneSteps : '',
      clinicalNotes: typeof parsed.clinicalNotes === 'string' ? parsed.clinicalNotes : '',
    };
  } catch {
    return null;
  }
}

export function serializeAsthmaActionPlan(plan: AsthmaActionPlan): string {
  return JSON.stringify(plan);
}

export function isAsthmaPlanConfigured(plan: AsthmaActionPlan | null): boolean {
  return Boolean(
    plan &&
      (plan.personalBestPef.trim() ||
        plan.relieverMedication.trim() ||
        plan.controllerNotes.trim() ||
        plan.yellowZoneSteps.trim() ||
        plan.redZoneSteps.trim() ||
        plan.clinicalNotes.trim()),
  );
}

export function getAsthmaPlanPersonalBest(plan: AsthmaActionPlan | null): number | null {
  return parsePefNumeric(plan?.personalBestPef);
}

export function formatAsthmaReportSummary(
  pefSummary: {
    count: number;
    latest: number | null;
    personalBest: number | null;
    latestZone: string | null;
    latestPercentOfBest: number | null;
  },
  plan: AsthmaActionPlan | null,
  options: { periodDays?: number } = {},
): string {
  const lines: string[] = [`Период: ${options.periodDays ?? 30} дней.`];

  const planBest = getAsthmaPlanPersonalBest(plan);
  if (planBest) {
    lines.push(`Лучшее ПСВ (план): ${planBest} л/мин.`);
  }
  if (plan?.relieverMedication.trim()) {
    lines.push(`Препарат скорой помощи: ${plan.relieverMedication.trim()}`);
  }
  if (plan?.controllerNotes.trim()) {
    lines.push(`Базовая терапия (заметки): ${plan.controllerNotes.trim()}`);
  }
  if (plan?.yellowZoneSteps.trim()) {
    lines.push(`Жёлтая зона: ${plan.yellowZoneSteps.trim()}`);
  }
  if (plan?.redZoneSteps.trim()) {
    lines.push(`Красная зона: ${plan.redZoneSteps.trim()}`);
  }
  if (plan?.clinicalNotes.trim()) {
    lines.push(`Заметки: ${plan.clinicalNotes.trim()}`);
  }

  if (!pefSummary.count) {
    lines.push('Измерений ПСВ за период нет.');
    return lines.join('\n');
  }

  const latestLine = [
    `Последнее ПСВ: ${pefSummary.latest ?? '—'} л/мин`,
    pefSummary.latestPercentOfBest != null ? `${pefSummary.latestPercentOfBest}% от лучшего` : null,
    pefSummary.latestZone ? `зона: ${pefSummary.latestZone}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  lines.push(`Измерений ПСВ: ${pefSummary.count}. ${latestLine}.`);

  return lines.join('\n');
}
