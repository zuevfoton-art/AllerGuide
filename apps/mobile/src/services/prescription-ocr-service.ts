import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import {
  getDemoPrescriptionParse,
  parsePrescriptionText,
  type PrescriptionParseResult,
} from '@allerguide/ai';
import { YC_OCR_ENABLED } from '@/src/constants/features';
import { recognizeImageViaApi } from '@/src/services/ocr-api-service';

const MAX_OCR_IMAGE_WIDTH = 1600;

export type PrescriptionOcrSource = 'photo' | 'pdf' | 'text' | 'demo';

export type PrescriptionOcrHintCode =
  | 'cloud_failed'
  | 'cloud_disabled'
  | 'demo'
  | 'empty_media'
  /** Cloud OCR returned text, but structured fields (drug) stayed empty. */
  | 'fields_incomplete'
  | 'parse_error';

export interface PrescriptionOcrOutcome {
  parsed: PrescriptionParseResult;
  source: PrescriptionOcrSource;
  /** Raw OCR / pasted text when available. */
  text: string;
  hintCode?: PrescriptionOcrHintCode;
  /** Technical detail for cloud_failed (HTTP / API message). */
  cloudError?: string;
}

async function readUriAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: 'base64' as never,
  });
}

async function imageUriToOcrPayload(uri: string): Promise<{ base64: string; mimeType: string }> {
  const result = await manipulateAsync(uri, [{ resize: { width: MAX_OCR_IMAGE_WIDTH } }], {
    compress: 0.75,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) {
    throw new Error('Image encode for OCR failed');
  }
  return { base64: result.base64, mimeType: 'image/jpeg' };
}

async function recognizeAttachedMedia(input: {
  photoUri?: string | null;
  pdfUri?: string | null;
}): Promise<{ text: string; source: 'photo' | 'pdf' } | { error: string } | null> {
  if (!YC_OCR_ENABLED) return null;

  const photoUri = input.photoUri?.trim();
  const pdfUri = input.pdfUri?.trim();
  if (!photoUri && !pdfUri) return null;

  try {
    const payload = photoUri
      ? await imageUriToOcrPayload(photoUri)
      : {
          base64: await readUriAsBase64(pdfUri!),
          mimeType: 'application/pdf',
        };

    const cloud = await recognizeImageViaApi({
      imageBase64: payload.base64,
      mimeType: payload.mimeType,
    });
    if (cloud?.ok && cloud.text.trim()) {
      return {
        text: cloud.text.trim(),
        source: photoUri ? 'photo' : 'pdf',
      };
    }
    if (cloud && !cloud.ok) {
      return { error: cloud.error };
    }
    return { error: 'empty' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ocr_failed';
    return { error: message };
  }
}

/**
 * Prefer OCR from attached photo/PDF (cloud Vision when flagged).
 * Falls back to pasted text, then offline demo parse.
 */
export async function recognizePrescription(input: {
  photoUri?: string | null;
  pdfUri?: string | null;
  manualText?: string;
}): Promise<PrescriptionOcrOutcome> {
  const manual = input.manualText?.trim() ?? '';
  if (manual) {
    return {
      parsed: parsePrescriptionText(manual),
      source: 'text',
      text: manual,
    };
  }

  const hasAttachment = Boolean(input.photoUri?.trim() || input.pdfUri?.trim());
  const media = await recognizeAttachedMedia({
    photoUri: input.photoUri,
    pdfUri: input.pdfUri,
  });

  if (media && 'text' in media) {
    const parsed = parsePrescriptionText(media.text);
    return {
      parsed,
      source: media.source,
      text: media.text,
      hintCode: parsed.drug.trim() ? undefined : 'fields_incomplete',
    };
  }

  const demo = getDemoPrescriptionParse();

  if (media && 'error' in media) {
    return {
      parsed: demo,
      source: 'demo',
      text: '',
      hintCode: 'cloud_failed',
      cloudError: media.error,
    };
  }

  if (hasAttachment && !YC_OCR_ENABLED) {
    return {
      parsed: demo,
      source: 'demo',
      text: '',
      hintCode: 'cloud_disabled',
    };
  }

  if (hasAttachment) {
    return {
      parsed: demo,
      source: 'demo',
      text: '',
      hintCode: 'empty_media',
    };
  }

  return {
    parsed: demo,
    source: 'demo',
    text: '',
    hintCode: 'demo',
  };
}
