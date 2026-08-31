import {
  getDemoMedicineLabelText,
  parseMedicineLabelText,
  parseMedicineVoiceUtterance,
  type MedicineVisionResult,
} from '@allerguide/ai';
import {
  isValidBarcode,
  normalizeBarcode,
  resolveMedicineAgeUsage,
  toMedicineCard,
  type MedicineAgeResolution,
  type MedicineCard,
  type MedicineSource,
} from '@allerguide/core';
import { MEDICINE_DB_ENABLED, YC_OCR_ENABLED } from '@/src/constants/features';
import { resolveProductByBarcode } from '@/src/services/barcode-lookup-service';
import { recognizeMedicineViaApi } from '@/src/services/medicines-api';
import { recognizeImageViaApi } from '@/src/services/ocr-api-service';

export type MedicineRecognitionHintCode =
  | 'cloud_failed'
  | 'cloud_disabled'
  | 'demo'
  | 'not_recognized'
  | 'fields_incomplete';

export interface MedicineRecognitionOutcome {
  card: MedicineCard | null;
  ageUsage: MedicineAgeResolution | null;
  source: MedicineSource | 'demo';
  cached?: boolean;
  hintCode?: MedicineRecognitionHintCode;
  cloudError?: string;
}

function cardFromVision(
  result: MedicineVisionResult,
  source: MedicineSource,
): MedicineCard {
  return toMedicineCard(result, source);
}

function outcomeFromCard(
  card: MedicineCard,
  ageYears: number | null,
  extras: Partial<MedicineRecognitionOutcome> = {},
): MedicineRecognitionOutcome {
  return {
    card,
    ageUsage: resolveMedicineAgeUsage(card, ageYears),
    source: card.source,
    ...extras,
  };
}

async function recognizeLocalOcrText(
  imageBase64: string,
  mimeType?: string,
): Promise<{ text: string } | { error: string } | null> {
  if (!YC_OCR_ENABLED) return null;
  try {
    const cloud = await recognizeImageViaApi({ imageBase64, mimeType });
    if (cloud?.ok && cloud.text.trim()) {
      return { text: cloud.text.trim() };
    }
    if (cloud && !cloud.ok) return { error: cloud.error };
    return { error: 'empty' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ocr_failed' };
  }
}

/**
 * Recognize a medicine package: catalog/VL when flagged, else local OCR parse,
 * then the offline demo label. Core diary save stays possible without the cloud.
 */
export async function recognizeMedicinePackage(input: {
  imageBase64?: string;
  mimeType?: string;
  ocrText?: string;
  name?: string;
  ageYears?: number | null;
}): Promise<MedicineRecognitionOutcome> {
  const ageYears = input.ageYears ?? null;
  const ocrText = input.ocrText?.trim() ?? '';

  if (MEDICINE_DB_ENABLED && (input.imageBase64 || ocrText || input.name?.trim())) {
    try {
      const cloud = await recognizeMedicineViaApi({
        imageBase64: input.imageBase64,
        mimeType: input.mimeType,
        ocrText: ocrText || undefined,
        name: input.name,
        ageYears,
      });
      if (cloud?.ok) {
        return {
          card: cloud.medicine,
          ageUsage: cloud.ageUsage,
          source: cloud.source,
          cached: cloud.cached,
        };
      }
      if (cloud && !cloud.ok) {
        const fallback = await recognizeOffline({ ...input, ocrText, ageYears });
        return {
          ...fallback,
          hintCode: fallback.hintCode ?? 'cloud_failed',
          cloudError: cloud.error,
        };
      }
    } catch (error) {
      const fallback = await recognizeOffline({ ...input, ocrText, ageYears });
      return {
        ...fallback,
        hintCode: fallback.hintCode ?? 'cloud_failed',
        cloudError: error instanceof Error ? error.message : 'recognize_failed',
      };
    }
  }

  return recognizeOffline({ ...input, ocrText, ageYears });
}

/**
 * Package barcode → catalog/OFF product, then the same medicine card path as a spoken name.
 * No demo Nurofen fallback when the barcode misses.
 */
export async function recognizeMedicineFromBarcode(input: {
  barcode: string;
  ageYears?: number | null;
}): Promise<MedicineRecognitionOutcome> {
  const barcode = normalizeBarcode(input.barcode);
  const ageYears = input.ageYears ?? null;
  if (!isValidBarcode(barcode)) {
    return { card: null, ageUsage: null, source: 'ocr', hintCode: 'not_recognized' };
  }

  const product = await resolveProductByBarcode(barcode);
  if (!product) {
    return { card: null, ageUsage: null, source: 'ocr', hintCode: 'not_recognized' };
  }

  const name = product.name.trim();
  const labelText = [product.name, product.brand, product.ingredients]
    .filter((part) => part?.trim())
    .join('\n');

  if (MEDICINE_DB_ENABLED && (name || labelText)) {
    try {
      const cloud = await recognizeMedicineViaApi({
        name: name || undefined,
        ocrText: labelText || undefined,
        ageYears,
      });
      if (cloud?.ok) {
        return {
          card: cloud.medicine,
          ageUsage: cloud.ageUsage,
          source: cloud.source,
          cached: cloud.cached,
        };
      }
    } catch {
      // Fall through to local parse / name prefill — same as photo cloud miss.
    }
  }

  const parsed =
    (labelText ? parseMedicineLabelText(labelText) : null) ??
    (name ? parseMedicineVoiceUtterance(name) : null);
  if (parsed) {
    return outcomeFromCard(cardFromVision(parsed, 'ocr'), ageYears);
  }

  if (!name) {
    return { card: null, ageUsage: null, source: 'ocr', hintCode: 'not_recognized' };
  }

  return outcomeFromCard(
    toMedicineCard(
      {
        name,
        manufacturer: product.brand ?? '',
        ingredients: product.ingredients,
        allergenTags: product.declaredAllergenIds,
        confidence: 'low',
      },
      'ocr',
    ),
    ageYears,
    { hintCode: 'fields_incomplete' },
  );
}

/** Spoken name/dose → same card/prefill path as a package photo. No demo fallback. */
export async function recognizeMedicineFromVoice(input: {
  transcript: string;
  ageYears?: number | null;
}): Promise<MedicineRecognitionOutcome> {
  const transcript = input.transcript.trim();
  if (!transcript) {
    return { card: null, ageUsage: null, source: 'ocr', hintCode: 'not_recognized' };
  }
  const spoken = parseMedicineVoiceUtterance(transcript);
  if (!spoken) {
    return { card: null, ageUsage: null, source: 'ocr', hintCode: 'not_recognized' };
  }
  return recognizeMedicinePackage({
    ocrText: transcript,
    name: spoken.name,
    ageYears: input.ageYears,
  });
}

async function recognizeOffline(input: {
  imageBase64?: string;
  mimeType?: string;
  ocrText: string;
  ageYears: number | null;
}): Promise<MedicineRecognitionOutcome> {
  if (input.ocrText) {
    const parsed =
      parseMedicineLabelText(input.ocrText) ?? parseMedicineVoiceUtterance(input.ocrText);
    if (parsed) {
      return outcomeFromCard(cardFromVision(parsed, 'ocr'), input.ageYears, {
        hintCode: parsed.confidence === 'low' ? 'fields_incomplete' : undefined,
      });
    }
    return { card: null, ageUsage: null, source: 'ocr', hintCode: 'not_recognized' };
  }

  if (input.imageBase64) {
    const media = await recognizeLocalOcrText(input.imageBase64, input.mimeType);
    if (media && 'text' in media) {
      const parsed = parseMedicineLabelText(media.text);
      if (parsed) {
        return outcomeFromCard(cardFromVision(parsed, 'ocr'), input.ageYears);
      }
      return { card: null, ageUsage: null, source: 'ocr', hintCode: 'not_recognized' };
    }

    const demo = parseMedicineLabelText(getDemoMedicineLabelText());
    const card = demo ? cardFromVision(demo, 'ocr') : null;
    if (media && 'error' in media) {
      return {
        card,
        ageUsage: card ? resolveMedicineAgeUsage(card, input.ageYears) : null,
        source: 'demo',
        hintCode: 'cloud_failed',
        cloudError: media.error,
      };
    }
    if (!YC_OCR_ENABLED && !MEDICINE_DB_ENABLED) {
      return {
        card,
        ageUsage: card ? resolveMedicineAgeUsage(card, input.ageYears) : null,
        source: 'demo',
        hintCode: 'cloud_disabled',
      };
    }
  }

  const demo = parseMedicineLabelText(getDemoMedicineLabelText());
  const card = demo ? cardFromVision(demo, 'ocr') : null;
  return {
    card,
    ageUsage: card ? resolveMedicineAgeUsage(card, input.ageYears) : null,
    source: 'demo',
    hintCode: 'demo',
  };
}
