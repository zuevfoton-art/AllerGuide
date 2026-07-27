/**
 * Yandex Vision OCR for label / menu photos (Phase 2).
 * Domain text cleanup stays in @allerguide/ai; this module only calls the API.
 */

const VISION_OCR_URL = 'https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText';

export interface YandexVisionOcrInput {
  /** Raw base64 (no data: URL prefix) */
  imageBase64: string;
  mimeType?: string;
  languageCodes?: string[];
}

export interface YandexVisionOcrResult {
  text: string;
  fullText: string;
}

function isOcrEnabled(): boolean {
  return process.env.YC_OCR_ENABLED === 'true';
}

function resolveMimeType(mimeType?: string): string {
  const raw = (mimeType || 'image/jpeg').toLowerCase();
  if (raw.includes('png')) return 'PNG';
  if (raw.includes('webp')) return 'WEBP';
  if (raw.includes('pdf')) return 'PDF';
  return 'JPEG';
}

function stripDataUrl(base64: string): string {
  const trimmed = base64.trim();
  const comma = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && comma >= 0) {
    return trimmed.slice(comma + 1);
  }
  return trimmed;
}

export function yandexVisionOcrConfigured(): boolean {
  return Boolean(process.env.YC_AI_API_KEY && process.env.YC_FOLDER_ID && isOcrEnabled());
}

export async function recognizeTextWithYandexVision(
  input: YandexVisionOcrInput,
): Promise<YandexVisionOcrResult | null> {
  const apiKey = process.env.YC_AI_API_KEY;
  const folderId = process.env.YC_FOLDER_ID;
  if (!apiKey || !folderId || !isOcrEnabled()) return null;

  const content = stripDataUrl(input.imageBase64);
  if (!content) return null;

  const languageCodes =
    input.languageCodes && input.languageCodes.length > 0
      ? input.languageCodes
      : ['ru', 'en'];

  const response = await fetch(VISION_OCR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${apiKey}`,
      'x-folder-id': folderId,
      'x-data-logging-enabled': 'false',
    },
    body: JSON.stringify({
      mimeType: resolveMimeType(input.mimeType),
      languageCodes,
      model: 'page',
      content,
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    result?: {
      textAnnotation?: {
        fullText?: string;
        blocks?: Array<{
          lines?: Array<{
            words?: Array<{ text?: string }>;
          }>;
        }>;
      };
    };
  };

  const annotation = payload.result?.textAnnotation;
  const fullText = (annotation?.fullText || '').trim();
  if (fullText) {
    return { text: fullText, fullText };
  }

  // Fallback: concatenate words if fullText is empty
  const parts: string[] = [];
  for (const block of annotation?.blocks || []) {
    for (const line of block.lines || []) {
      const lineText = (line.words || [])
        .map((w) => w.text || '')
        .filter(Boolean)
        .join(' ');
      if (lineText) parts.push(lineText);
    }
  }
  const joined = parts.join('\n').trim();
  if (!joined) return { text: '', fullText: '' };
  return { text: joined, fullText: joined };
}
