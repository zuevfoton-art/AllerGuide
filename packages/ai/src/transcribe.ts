/** Result of a speech-to-text transcription request. */
export type TranscribeResult = {
  text: string;
  language?: string;
  durationMs?: number;
};

/**
 * Appends a new transcript to existing field text with a paragraph break when needed.
 */
export function appendTranscript(existing: string, transcript: string): string {
  const next = transcript.trim();
  if (!next) return existing;
  const prev = existing.trim();
  if (!prev) return next;
  return `${prev}\n${next}`;
}

/**
 * Maps app locale codes to BCP-47 tags for speech recognition / Whisper.
 */
export function resolveSpeechLocale(locale: string): string {
  const map: Record<string, string> = {
    ru: 'ru-RU',
    en: 'en-US',
    de: 'de-DE',
    es: 'es-ES',
    fr: 'fr-FR',
    it: 'it-IT',
  };
  return map[locale] ?? 'ru-RU';
}

/** Whisper API language code (ISO-639-1) from app locale. */
export function resolveWhisperLanguage(locale: string): string {
  return locale.split('-')[0]?.toLowerCase() || 'ru';
}
