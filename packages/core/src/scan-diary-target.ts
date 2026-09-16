/** Where a scanner verdict should land in the diary. */
export type ScanDiaryTarget = 'food' | 'medicine' | 'trigger';

export const SCAN_DIARY_SECTION_BY_TARGET = {
  food: 'Питание',
  medicine: 'Лекарство',
  trigger: 'Триггер',
} as const;

export type ScanDiarySectionType = (typeof SCAN_DIARY_SECTION_BY_TARGET)[ScanDiaryTarget];

/**
 * Classify a scan onto a diary section. Medicine wins over cosmetics/household
 * so a tablet pack that landed in Open Products Facts is not saved as a trigger.
 */
export function resolveScanDiaryTarget(input: {
  mode?: string | null;
  productCategory?: string | null;
  source?: string | null;
  hasMedicineCatalogHit?: boolean;
  hasMedicineLabelSignal?: boolean;
}): ScanDiaryTarget {
  const category = input.productCategory?.trim() ?? '';
  const mode = input.mode?.trim() ?? '';
  const source = input.source?.trim() ?? '';

  if (
    input.hasMedicineCatalogHit ||
    input.hasMedicineLabelSignal ||
    mode === 'medicine' ||
    category === 'medicine' ||
    source === 'openmedicinefacts'
  ) {
    return 'medicine';
  }

  if (
    mode === 'cosmetics' ||
    category === 'beauty' ||
    category === 'household' ||
    source === 'openbeautyfacts' ||
    source === 'openproductsfacts'
  ) {
    return 'trigger';
  }

  return 'food';
}

export function scanDiarySectionForTarget(target: ScanDiaryTarget): ScanDiarySectionType {
  return SCAN_DIARY_SECTION_BY_TARGET[target];
}

/** Analytics prop for `scan_saved_to_diary` — section id, not the RU title. */
export function diarySectionAnalyticsKey(sectionType: string): string {
  if (sectionType === 'Лекарство') return 'medicine';
  if (sectionType === 'Триггер') return 'trigger';
  if (sectionType === 'Питание') return 'food';
  if (sectionType === 'Кожа') return 'skin';
  if (sectionType === 'Заметка') return 'note';
  return 'other';
}

/** Short context line for a cosmetics / household scan saved as «Триггер». */
export function scanTriggerSourceLine(input: {
  productCategory?: string | null;
  source?: string | null;
}): string {
  if (input.productCategory === 'beauty' || input.source === 'openbeautyfacts') {
    return 'Сканер · косметика';
  }
  if (input.productCategory === 'household' || input.source === 'openproductsfacts') {
    return 'Сканер · бытовая химия';
  }
  return 'Сканер';
}
