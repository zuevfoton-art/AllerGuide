/**
 * Multi-row «схема приёма» helpers shared by ASIT and prescribed therapy.
 */

/** At least one editable row; drop trailing empties except a single blank seed. */
export function normalizeScheduleLines(lines?: string[] | null, notesFallback?: string | null): string[] {
  const fromArray = (lines ?? []).map((line) => line.replace(/\s+$/g, ''));
  const nonEmpty = fromArray.filter((line) => line.trim().length > 0);
  if (nonEmpty.length > 0) return nonEmpty;

  const fromNotes = (notesFallback ?? '')
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (fromNotes.length > 0) return fromNotes;

  return [''];
}

export function scheduleLinesToNotes(lines: string[] | null | undefined): string {
  return (lines ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

/** Insert an empty row after `index` (used by the «+» control). */
export function insertScheduleLineAfter(lines: string[], index: number): string[] {
  const next = [...lines];
  const at = Math.max(0, Math.min(index + 1, next.length));
  next.splice(at, 0, '');
  return next;
}

export function updateScheduleLine(lines: string[], index: number, value: string): string[] {
  const next = [...lines];
  if (index < 0 || index >= next.length) return next;
  next[index] = value;
  return next;
}

export function removeScheduleLine(lines: string[], index: number): string[] {
  if (lines.length <= 1) return [''];
  return lines.filter((_, i) => i !== index);
}
