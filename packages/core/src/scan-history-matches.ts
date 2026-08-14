export type ScanHistoryMatchesPayload = {
  direct: string[];
  cross: string[];
  trace: string[];
  composition?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

/**
 * Persist scan matches as a structured JSON blob.
 * Legacy readers that expect a flat string[] still work via `parseScanHistoryMatchLabels`.
 */
export function serializeScanHistoryMatches(input: {
  matches: string[];
  crossMatches?: string[];
  traceMatches?: string[];
  composition?: string;
}): string {
  const payload: ScanHistoryMatchesPayload = {
    direct: [...input.matches],
    cross: [...(input.crossMatches ?? [])],
    trace: [...(input.traceMatches ?? [])],
  };
  const composition = input.composition?.trim();
  if (composition) payload.composition = composition;
  return JSON.stringify(payload);
}

/** Read both the structured payload and the legacy flat-array / CSV formats. */
export function parseScanHistoryMatches(raw: string | null | undefined): ScanHistoryMatchesPayload {
  if (!raw?.trim()) {
    return { direct: [], cross: [], trace: [] };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return { direct: asStringList(parsed), cross: [], trace: [] };
    }
    if (isRecord(parsed)) {
      const composition =
        typeof parsed.composition === 'string' && parsed.composition.trim()
          ? parsed.composition
          : undefined;
      return {
        direct: asStringList(parsed.direct ?? parsed.matches),
        cross: asStringList(parsed.cross ?? parsed.crossMatches),
        trace: asStringList(parsed.trace ?? parsed.traceMatches),
        composition,
      };
    }
  } catch {
    // fall through to CSV
  }

  return {
    direct: raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
    cross: [],
    trace: [],
  };
}

export function parseScanHistoryMatchLabels(raw: string | null | undefined): string[] {
  const payload = parseScanHistoryMatches(raw);
  return [...payload.direct, ...payload.cross, ...payload.trace];
}
