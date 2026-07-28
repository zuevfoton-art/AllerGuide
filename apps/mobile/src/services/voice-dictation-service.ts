import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  addSpeechRecognitionListener,
  isRecognitionAvailable,
  supportsOnDeviceRecognition,
} from 'expo-speech-recognition';
import { appendTranscript, resolveSpeechLocale } from '@allerguide/core';
import { logCaughtError } from '@/src/services/error-reporting';

export type VoiceDictationState = 'idle' | 'listening';

type FinalResultHandler = (transcript: string) => void;
type ErrorHandler = (code: string) => void;

let resultSub: { remove: () => void } | null = null;
let errorSub: { remove: () => void } | null = null;
let endSub: { remove: () => void } | null = null;
let latestTranscript = '';
let onFinal: FinalResultHandler | null = null;
let onError: ErrorHandler | null = null;
let listening = false;

function clearListeners() {
  resultSub?.remove();
  errorSub?.remove();
  endSub?.remove();
  resultSub = null;
  errorSub = null;
  endSub = null;
}

/** Whether OS / Web speech recognition is available on this runtime. */
export function isVoiceInputSupported(): boolean {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return false;
      const win = window as typeof window & {
        SpeechRecognition?: unknown;
        webkitSpeechRecognition?: unknown;
      };
      return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
    }
    return isRecognitionAvailable();
  } catch (error) {
    logCaughtError('isVoiceInputSupported', error, { level: 'warn' });
    return false;
  }
}

function preferOnDevice(): boolean {
  try {
    if (Platform.OS === 'ios') return supportsOnDeviceRecognition();
    return false;
  } catch {
    return false;
  }
}

/**
 * Starts OS / Web speech recognition.
 * Final transcript is delivered via `handlers.onResult` when recognition ends.
 */
export async function startVoiceDictation(
  locale: string,
  handlers: { onResult: FinalResultHandler; onError?: ErrorHandler },
): Promise<void> {
  if (listening) {
    await cancelVoiceDictation();
  }

  latestTranscript = '';
  onFinal = handlers.onResult;
  onError = handlers.onError ?? null;

  const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('VOICE_PERMISSION_DENIED');
  }

  if (!isVoiceInputSupported()) {
    throw new Error('VOICE_NOT_SUPPORTED');
  }

  clearListeners();

  resultSub = addSpeechRecognitionListener('result', (event) => {
    const parts: string[] = [];
    for (const result of event.results ?? []) {
      const transcript = result?.transcript?.trim();
      if (transcript) parts.push(transcript);
    }
    if (parts.length) {
      latestTranscript = parts.join(' ').trim();
    }
  });

  errorSub = addSpeechRecognitionListener('error', (event) => {
    listening = false;
    const code = event.error === 'not-allowed' ? 'VOICE_PERMISSION_DENIED' : 'VOICE_RECOGNITION_FAILED';
    onError?.(code);
    clearListeners();
  });

  endSub = addSpeechRecognitionListener('end', () => {
    listening = false;
    const text = latestTranscript.trim();
    const handler = onFinal;
    onFinal = null;
    clearListeners();
    handler?.(text);
  });

  listening = true;
  ExpoSpeechRecognitionModule.start({
    lang: resolveSpeechLocale(locale),
    interimResults: true,
    continuous: true,
    requiresOnDeviceRecognition: preferOnDevice(),
    addsPunctuation: true,
  });
}

/** Stops recognition; final text arrives via the start() onResult callback. */
export async function stopVoiceDictation(): Promise<void> {
  if (!listening) return;
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch (error) {
    logCaughtError('stopVoiceDictation', error, { level: 'warn' });
    listening = false;
    const text = latestTranscript.trim();
    const handler = onFinal;
    onFinal = null;
    clearListeners();
    handler?.(text);
  }
}

/** Cancels recognition without delivering text. */
export async function cancelVoiceDictation(): Promise<void> {
  listening = false;
  onFinal = null;
  latestTranscript = '';
  clearListeners();
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch (error) {
    logCaughtError('cancelVoiceDictation', error, { level: 'warn' });
  }
}

export function mergeVoiceIntoField(existing: string, transcript: string): string {
  return appendTranscript(existing, transcript);
}
