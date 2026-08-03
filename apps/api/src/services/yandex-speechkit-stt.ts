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

/** SpeechKit `lpcm` expects raw PCM; clients may still send a RIFF/WAVE wrapper. */
export function stripWavHeaderIfPresent(audio: Buffer): Buffer {
  if (
    audio.length < 12 ||
    audio.subarray(0, 4).toString('ascii') !== 'RIFF' ||
    audio.subarray(8, 12).toString('ascii') !== 'WAVE'
  ) {
    return audio;
  }

  let offset = 12;
  while (offset + 8 <= audio.length) {
    const id = audio.subarray(offset, offset + 4).toString('ascii');
    const size = audio.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    if (id === 'data') {
      return audio.subarray(dataStart, Math.min(dataStart + size, audio.length));
    }
    offset = dataStart + size;
  }
  return audio;
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
  if (format === 'lpcm') {
    audio = stripWavHeaderIfPresent(audio);
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
  // Empty transcript is a successful recognition with no speech — not a provider outage.
  return (payload.result ?? '').trim();
}
