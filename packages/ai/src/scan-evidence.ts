/**
 * Combine VL (dish photo) and OCR (label text) into one scan string
 * and classify which evidence the verdict is based on.
 */

export type ScanEvidenceKind = 'vl' | 'ocr' | 'vl_ocr';

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function collectOcrTokens(ocrText: string): Set<string> {
  const tokens = new Set<string>();
  for (const part of ocrText.split(/[,;\n]/)) {
    const token = normalizeToken(part);
    if (token) tokens.add(token);
  }
  return tokens;
}

/**
 * OCR text first; VL ingredients (and dish name) are appended when they are
 * not already present, compared case-insensitively so keyword matching
 * does not double-count the same allergen.
 */
export function buildCombinedScanText(input: {
  ocrText: string;
  visionIngredients: string[];
  dishName?: string;
}): string {
  const ocrText = input.ocrText.trim();
  const seen = collectOcrTokens(ocrText);
  const extras: string[] = [];

  const appendUnique = (value: string) => {
    const trimmed = value.trim();
    const token = normalizeToken(trimmed);
    if (!token || seen.has(token)) return;
    if (ocrText && ocrText.toLowerCase().includes(token)) {
      seen.add(token);
      return;
    }
    seen.add(token);
    extras.push(trimmed);
  };

  if (input.dishName) appendUnique(input.dishName);
  for (const ingredient of input.visionIngredients) {
    appendUnique(ingredient);
  }

  if (extras.length === 0) return ocrText;
  if (!ocrText) return extras.join(', ');
  return `${ocrText}\n${extras.join(', ')}`;
}

export function resolveScanEvidenceKind(input: {
  hasVision: boolean;
  hasReadableOcr: boolean;
}): ScanEvidenceKind {
  if (input.hasVision && input.hasReadableOcr) return 'vl_ocr';
  if (input.hasVision) return 'vl';
  return 'ocr';
}
