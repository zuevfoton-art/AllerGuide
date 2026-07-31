/**
 * Yandex SpeechKit STT for POST /api/stt (Phase 3).
 * Domain stays thin: bytes in → transcript out.
 */

const STT_BASE_URL = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize';

export type SpeechkitAudioFormat = 'lpcm' | 'oggopus';

export function yandexSpeechkitSttConfigured(): boolean {
  return (
    process.env.YC_STT_ENABLED === 'true' &&
    Boolean(process.env.YC_AI_API_KEY?.trim()) &&
    Boolean(process.env.YC_FOLDER_ID?.trim())
  );
}

export async function recognizeSpeechWithYandexSpeechkit(input: {
  audioBase64: string;
  lang?: string;
  format?: SpeechkitAudioFormat;
  sampleRateHertz?: number;
}): Promise<string | null> {
  if (!yandexSpeechkitSttConfigured()) return null;

  const apiKey = process.env.YC_AI_API_KEY!.trim();
  const folderId = process.env.YC_FOLDER_ID!.trim();
  const lang = (input.lang ?? 'ru-RU').trim() || 'ru-RU';
  const format = input.format ?? 'oggopus';
  const sampleRate = input.sampleRateHertz ?? 16000;

  let audio: Buffer;
  try {
    audio = Buffer.from(input.audioBase64.trim(), 'base64');
  } catch {
    return null;
  }
  if (audio.length < 16) return null;

  const params = new URLSearchParams({
    lang,
    folderId,
    format,
  });
  if (format === 'lpcm') {
    params.set('sampleRateHertz', String(sampleRate));
  }

  const response = await fetch(`${STT_BASE_URL}?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Api-Key ${apiKey}`,
    },
    body: new Uint8Array(audio),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { result?: string };
  const text = payload.result?.trim();
  return text ? text : null;
}
