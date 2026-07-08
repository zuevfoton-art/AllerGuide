import type { AllergyConfirmationSource } from './allergy-confirmations';
import { ALLERGY_CONFIRMATION_LABELS } from './allergy-confirmations';
import type { AllergyConditionId } from './allergy-conditions';
import { getConditionType } from './allergy-conditions';

export type ConditionOnsetKind =
  | 'infancy'
  | 'early-childhood'
  | 'school-age'
  | 'adolescence'
  | 'adulthood'
  | 'unknown';

export type ConditionEpisodeStatus =
  | 'active'
  | 'resolved'
  | 'in-remission'
  | 'unknown';

export type ConditionDiagnosedBy = AllergyConfirmationSource;

export type FoodSymptomTiming =
  | 'within-30min'
  | '30min-2h'
  | 'over-2h'
  | 'unknown';

export type ComorbidityRelation = 'preceded' | 'concurrent';

export interface ComorbidityLink {
  fromConditionId: AllergyConditionId;
  toConditionId: AllergyConditionId;
  relation: ComorbidityRelation;
}

export interface ConditionEpisode {
  conditionId: AllergyConditionId;
  onsetKind: ConditionOnsetKind;
  onsetYear?: number;
  status: ConditionEpisodeStatus;
  diagnosedBy: ConditionDiagnosedBy;
  /** EAACI food history: time from ingestion to symptoms (food type only). */
  foodSymptomTiming?: FoodSymptomTiming;
  /** ARIA ocular phenotype flag (rhinitis type only). */
  ocularSymptoms?: boolean;
  notes?: string;
}

export interface ConditionHistory {
  v: 1 | 2;
  episodes: ConditionEpisode[];
  comorbidityLinks?: ComorbidityLink[];
}

export type ConditionEpisodeInput = Omit<ConditionEpisode, 'conditionId' | 'onsetYear'> & {
  onsetYear?: number | string;
};

export const CONDITION_ONSET_KINDS: ConditionOnsetKind[] = [
  'infancy',
  'early-childhood',
  'school-age',
  'adolescence',
  'adulthood',
  'unknown',
];

export const CONDITION_EPISODE_STATUSES: ConditionEpisodeStatus[] = [
  'active',
  'in-remission',
  'resolved',
  'unknown',
];

export const FOOD_SYMPTOM_TIMINGS: FoodSymptomTiming[] = [
  'within-30min',
  '30min-2h',
  'over-2h',
  'unknown',
];

export const CONDITION_ONSET_KIND_LABELS: Record<ConditionOnsetKind, string> = {
  infancy: 'Младенчество (0–2 года)',
  'early-childhood': 'Раннее детство (2–6 лет)',
  'school-age': 'Школьный возраст (6–12 лет)',
  adolescence: 'Подростковый возраст',
  adulthood: 'Взрослый возраст',
  unknown: 'Не помню',
};

export const CONDITION_EPISODE_STATUS_LABELS: Record<ConditionEpisodeStatus, string> = {
  active: 'Активно',
  'in-remission': 'В ремиссии',
  resolved: 'Прошло / не беспокоит',
  unknown: 'Не знаю',
};

export const FOOD_SYMPTOM_TIMING_LABELS: Record<FoodSymptomTiming, string> = {
  'within-30min': 'До 30 минут',
  '30min-2h': '30 минут — 2 часа',
  'over-2h': 'Более 2 часов',
  unknown: 'Не знаю',
};

export function createDefaultConditionEpisode(
  conditionId: AllergyConditionId,
): ConditionEpisode {
  return {
    conditionId,
    onsetKind: 'unknown',
    status: 'active',
    diagnosedBy: 'self_reported',
  };
}

export function createDefaultConditionHistory(
  conditionIds: AllergyConditionId[] = [],
): ConditionHistory {
  return {
    v: 1,
    episodes: conditionIds.map(createDefaultConditionEpisode),
  };
}

function parseOnsetYear(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const year = Math.trunc(value);
    if (year >= 1900 && year <= new Date().getFullYear()) return year;
  }
  if (typeof value === 'string' && value.trim()) {
    const year = Number(value.trim());
    if (Number.isFinite(year) && year >= 1900 && year <= new Date().getFullYear()) {
      return year;
    }
  }
  return undefined;
}

function isOnsetKind(value: unknown): value is ConditionOnsetKind {
  return typeof value === 'string' && CONDITION_ONSET_KINDS.includes(value as ConditionOnsetKind);
}

function isEpisodeStatus(value: unknown): value is ConditionEpisodeStatus {
  return typeof value === 'string' && CONDITION_EPISODE_STATUSES.includes(value as ConditionEpisodeStatus);
}

function isDiagnosedBy(value: unknown): value is ConditionDiagnosedBy {
  return value === 'self_reported' || value === 'specific_ige' || value === 'clinician';
}

function isFoodSymptomTiming(value: unknown): value is FoodSymptomTiming {
  return typeof value === 'string' && FOOD_SYMPTOM_TIMINGS.includes(value as FoodSymptomTiming);
}

function isConditionId(value: unknown): value is AllergyConditionId {
  return typeof value === 'string' && Boolean(getConditionType(value as AllergyConditionId));
}

function normalizeEpisode(raw: unknown): ConditionEpisode | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  if (!isConditionId(item.conditionId)) return null;

  const onsetKind = isOnsetKind(item.onsetKind) ? item.onsetKind : 'unknown';
  const status = isEpisodeStatus(item.status) ? item.status : 'active';
  const diagnosedBy = isDiagnosedBy(item.diagnosedBy) ? item.diagnosedBy : 'self_reported';
  const onsetYear = parseOnsetYear(item.onsetYear);
  const foodSymptomTiming =
    item.conditionId === 'food' && isFoodSymptomTiming(item.foodSymptomTiming)
      ? item.foodSymptomTiming
      : undefined;
  const ocularSymptoms =
    item.conditionId === 'rhinitis' && item.ocularSymptoms === true ? true : undefined;
  const notes = typeof item.notes === 'string' ? item.notes.trim() : '';

  return {
    conditionId: item.conditionId,
    onsetKind,
    status,
    diagnosedBy,
    ...(onsetYear !== undefined ? { onsetYear } : {}),
    ...(foodSymptomTiming ? { foodSymptomTiming } : {}),
    ...(ocularSymptoms ? { ocularSymptoms } : {}),
    ...(notes ? { notes } : {}),
  };
}

function isComorbidityRelation(value: unknown): value is ComorbidityRelation {
  return value === 'preceded' || value === 'concurrent';
}

function normalizeComorbidityLink(raw: unknown): ComorbidityLink | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  if (!isConditionId(item.fromConditionId) || !isConditionId(item.toConditionId)) return null;
  if (!isComorbidityRelation(item.relation)) return null;
  if (item.fromConditionId === item.toConditionId) return null;

  return {
    fromConditionId: item.fromConditionId,
    toConditionId: item.toConditionId,
    relation: item.relation,
  };
}

export function parseConditionHistory(raw: string | null | undefined): ConditionHistory | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (record.v !== 1 && record.v !== 2) return null;

    const episodes: ConditionEpisode[] = [];
    if (Array.isArray(record.episodes)) {
      for (const item of record.episodes) {
        const episode = normalizeEpisode(item);
        if (episode) episodes.push(episode);
      }
    }

    const comorbidityLinks: ComorbidityLink[] = [];
    if (Array.isArray(record.comorbidityLinks)) {
      for (const item of record.comorbidityLinks) {
        const link = normalizeComorbidityLink(item);
        if (link) comorbidityLinks.push(link);
      }
    }

    if (record.v === 2 || comorbidityLinks.length > 0) {
      return {
        v: 2,
        episodes,
        ...(comorbidityLinks.length ? { comorbidityLinks } : {}),
      };
    }

    return { v: 1, episodes };
  } catch {
    return null;
  }
}

export function serializeConditionHistory(history: ConditionHistory): string {
  const payload =
    history.comorbidityLinks?.length || history.v === 2
      ? { v: 2 as const, episodes: history.episodes, comorbidityLinks: history.comorbidityLinks ?? [] }
      : { v: 1 as const, episodes: history.episodes };
  return JSON.stringify(payload);
}

export function normalizeConditionEpisodeInput(
  conditionId: AllergyConditionId,
  input: Partial<ConditionEpisodeInput> = {},
): ConditionEpisode {
  const base = createDefaultConditionEpisode(conditionId);
  const onsetYear = parseOnsetYear(input.onsetYear);

  return {
    ...base,
    onsetKind: isOnsetKind(input.onsetKind) ? input.onsetKind : base.onsetKind,
    status: isEpisodeStatus(input.status) ? input.status : base.status,
    diagnosedBy: isDiagnosedBy(input.diagnosedBy) ? input.diagnosedBy : base.diagnosedBy,
    ...(onsetYear !== undefined ? { onsetYear } : {}),
    ...(conditionId === 'food' && isFoodSymptomTiming(input.foodSymptomTiming)
      ? { foodSymptomTiming: input.foodSymptomTiming }
      : {}),
    ...(conditionId === 'rhinitis' && input.ocularSymptoms === true
      ? { ocularSymptoms: true }
      : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  };
}

/** Build persisted history from onboarding selections + per-type drafts. */
export function buildConditionHistoryFromOnboarding(
  conditionIds: AllergyConditionId[],
  drafts: Partial<Record<AllergyConditionId, Partial<ConditionEpisodeInput>>> = {},
  comorbidityLinks: ComorbidityLink[] = [],
): ConditionHistory {
  const unique = [...new Set(conditionIds)];
  const episodes = unique.map((conditionId) =>
    normalizeConditionEpisodeInput(conditionId, drafts[conditionId]),
  );

  if (comorbidityLinks.length) {
    return { v: 2, episodes, comorbidityLinks };
  }

  return { v: 1, episodes };
}

/** Keep episodes aligned with currently selected condition types. */
export function reconcileConditionHistory(
  history: ConditionHistory | null,
  conditionIds: AllergyConditionId[],
): ConditionHistory {
  const selected = new Set(conditionIds);
  const byId = new Map<AllergyConditionId, ConditionEpisode>();

  for (const episode of history?.episodes ?? []) {
    if (selected.has(episode.conditionId) && !byId.has(episode.conditionId)) {
      byId.set(episode.conditionId, episode);
    }
  }

  for (const conditionId of selected) {
    if (!byId.has(conditionId)) {
      byId.set(conditionId, createDefaultConditionEpisode(conditionId));
    }
  }

  const nextEpisodes = [...selected]
    .map((id) => byId.get(id))
    .filter((item): item is ConditionEpisode => Boolean(item));

  const selectedSet = selected;
  const links = (history?.comorbidityLinks ?? []).filter(
    (link) => selectedSet.has(link.fromConditionId) && selectedSet.has(link.toConditionId),
  );

  if (links.length || history?.v === 2) {
    return {
      v: 2,
      episodes: nextEpisodes,
      ...(links.length ? { comorbidityLinks: links } : {}),
    };
  }

  return { v: 1, episodes: nextEpisodes };
}

export function getConditionEpisode(
  history: ConditionHistory | null | undefined,
  conditionId: AllergyConditionId,
): ConditionEpisode | undefined {
  return history?.episodes.find((item) => item.conditionId === conditionId);
}

export function upsertConditionEpisode(
  history: ConditionHistory | null | undefined,
  episode: ConditionEpisode,
): ConditionHistory {
  const current = history ?? { v: 1, episodes: [] };
  const rest = current.episodes.filter((item) => item.conditionId !== episode.conditionId);
  return {
    v: 1,
    episodes: [...rest, episode],
  };
}

export function formatConditionHistoryReportText(history: ConditionHistory | null): string {
  if (!history?.episodes.length) {
    return 'Хронология аллергических состояний не указана.';
  }

  const episodeText = history.episodes
    .map((episode) => {
      const typeLabel = getConditionType(episode.conditionId)?.label ?? episode.conditionId;
      const lines = [
        `• ${typeLabel}`,
        `  Дебют: ${CONDITION_ONSET_KIND_LABELS[episode.onsetKind]}`,
        ...(episode.onsetYear ? [`  Год: ${episode.onsetYear}`] : []),
        `  Статус: ${CONDITION_EPISODE_STATUS_LABELS[episode.status]}`,
        `  Подтверждение: ${ALLERGY_CONFIRMATION_LABELS[episode.diagnosedBy]}`,
      ];
      if (episode.foodSymptomTiming) {
        lines.push(`  Время симптомов после еды: ${FOOD_SYMPTOM_TIMING_LABELS[episode.foodSymptomTiming]}`);
      }
      if (episode.ocularSymptoms) {
        lines.push('  Глазные симптомы: да');
      }
      if (episode.notes) {
        lines.push(`  Заметки: ${episode.notes}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');

  const linkLines = formatComorbidityLinksReportText(history.comorbidityLinks);
  if (!linkLines) return episodeText;

  return `${episodeText}\n\nСвязи коморbidности:\n${linkLines}`;
}

export function formatComorbidityLinksReportText(links: ComorbidityLink[] | undefined): string {
  if (!links?.length) return '';

  return links
    .map((link) => {
      const from = getConditionType(link.fromConditionId)?.label ?? link.fromConditionId;
      const to = getConditionType(link.toConditionId)?.label ?? link.toConditionId;
      if (link.relation === 'concurrent') {
        return `• ${from} и ${to} — примерно одновременно`;
      }
      return `• ${from} появилось раньше, чем ${to}`;
    })
    .join('\n');
}

export function conditionHistoryToDraftMap(
  history: ConditionHistory | null,
): Partial<Record<AllergyConditionId, ConditionEpisodeInput>> {
  const map: Partial<Record<AllergyConditionId, ConditionEpisodeInput>> = {};
  for (const episode of history?.episodes ?? []) {
    map[episode.conditionId] = {
      onsetKind: episode.onsetKind,
      onsetYear: episode.onsetYear,
      status: episode.status,
      diagnosedBy: episode.diagnosedBy,
      foodSymptomTiming: episode.foodSymptomTiming,
      ocularSymptoms: episode.ocularSymptoms,
      notes: episode.notes,
    };
  }
  return map;
}

export function listConditionPairs(
  conditionIds: AllergyConditionId[],
): Array<[AllergyConditionId, AllergyConditionId]> {
  const unique = [...new Set(conditionIds)];
  const pairs: Array<[AllergyConditionId, AllergyConditionId]> = [];
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      pairs.push([unique[i]!, unique[j]!]);
    }
  }
  return pairs;
}

export function upsertComorbidityLink(
  links: ComorbidityLink[],
  link: ComorbidityLink,
): ComorbidityLink[] {
  const rest = links.filter(
    (item) =>
      !(
        (item.fromConditionId === link.fromConditionId &&
          item.toConditionId === link.toConditionId) ||
        (item.fromConditionId === link.toConditionId && item.toConditionId === link.fromConditionId)
      ),
  );
  return [...rest, link];
}
