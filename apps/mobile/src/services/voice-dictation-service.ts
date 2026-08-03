import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  addSpeechRecognitionListener,
  getSpeechRecognitionServices,
  isRecognitionAvailable,
  supportsOnDeviceRecognition,
} from 'expo-speech-recognition';
import { appendTranscript, resolveSpeechLocale } from '@allerguide/core';
import { YC_STT_ENABLED } from '@/src/constants/features';
import { logCaughtError } from '@/src/services/error-reporting';
import { recognizeSpeechViaApi } from '@/src/services/stt-api-service';
import {
  cancelMicRecording,
  isMicRecordingActive,
  startMicRecording,
  stopMicRecording,
} from '@/src/services/voice-mic-recording-service';

export type VoiceDictationState = 'idle' | 'listening' | 'processing';
export type VoiceDictationMode = 'os' | 'cloud-mic';

type FinalResultHandler = (transcript: string) => void;
type ErrorHandler = (code: string) => void;
type StateHandler = (state: VoiceDictationState) => void;

type OsSpeechStartOptions = Parameters<typeof ExpoSpeechRecognitionModule.start>[0];

let resultSub: { remove: () => void } | null = null;
let errorSub: { remove: () => void } | null = null;
let endSub: { remove: () => void } | null = null;
let latestTranscript = '';
let onFinal: FinalResultHandler | null = null;
let onError: ErrorHandler | null = null;
let onState: StateHandler | null = null;
let listening = false;
let activeMode: VoiceDictationMode | null = null;
/** Locale for the active cloud-mic session (used when stopping). */
let cloudMicLocale = 'ru';

function clearListeners() {
  resultSub?.remove();
  errorSub?.remove();
  endSub?.remove();
  resultSub = null;
  errorSub = null;
  endSub = null;
}

function setListening(value: boolean) {
  listening = value;
}

/** Whether OS / Web speech recognition is available on this runtime. */
export function isOsSpeechRecognitionSupported(): boolean {
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
    logCaughtError('isOsSpeechRecognitionSupported', error, { level: 'warn' });
    return false;
  }
}

/**
 * Voice input is available when either OS speech recognition works
 * or cloud SpeechKit STT is enabled (mic → /api/stt).
 */
export function isVoiceInputSupported(): boolean {
  return isOsSpeechRecognitionSupported() || YC_STT_ENABLED;
}

/** Which capture path will be used on the next start. */
export function resolveVoiceDictationMode(): VoiceDictationMode | null {
  if (isOsSpeechRecognitionSupported()) return 'os';
  if (YC_STT_ENABLED) return 'cloud-mic';
  return null;
}

function preferOnDevice(): boolean {
  try {
    if (Platform.OS === 'ios') return supportsOnDeviceRecognition();
    return false;
  } catch {
    return false;
  }
}

function preferAndroidRecognitionPackage(): string | undefined {
  if (Platform.OS !== 'android') return undefined;
  try {
    const services = getSpeechRecognitionServices();
    if (services.includes('com.google.android.tts')) {
      return 'com.google.android.tts';
    }
    if (services.includes('com.google.android.googlequicksearchbox')) {
      return 'com.google.android.googlequicksearchbox';
    }
  } catch (error) {
    logCaughtError('preferAndroidRecognitionPackage', error, { level: 'warn' });
  }
  return undefined;
}

/**
 * Platform-safe options for expo-speech-recognition.
 * Android: `continuous` / `addsPunctuation` are unsupported or crash-prone on many devices
 * (custom AudioRecord path; punctuation only with on-device API 33+).
 */
export function buildOsSpeechStartOptions(locale: string): OsSpeechStartOptions {
  const isAndroid = Platform.OS === 'android';
  const options: OsSpeechStartOptions = {
    lang: resolveSpeechLocale(locale),
    interimResults: true,
    continuous: !isAndroid,
    requiresOnDeviceRecognition: preferOnDevice(),
    addsPunctuation: !isAndroid,
  };

  const androidPackage = preferAndroidRecognitionPackage();
  if (androidPackage) {
    options.androidRecognitionServicePackage = androidPackage;
  }

  return options;
}

/**
 * Requests RECORD_AUDIO only when not already granted. On Android 16 the
 * permission dialog result can be delivered twice (expo/expo#39480), so we
 * avoid redundant requests to minimize exposure to that OS bug.
 */
async function ensureOsSpeechPermission(): Promise<boolean> {
  try {
    const current = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
  } catch (error) {
    logCaughtError('ensureOsSpeechPermission.get', error, { level: 'warn' });
  }
  const requested = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return requested.granted;
}

async function startOsSpeechDictation(locale: string): Promise<void> {
  const granted = await ensureOsSpeechPermission();
  if (!granted) {
    throw new Error('VOICE_PERMISSION_DENIED');
  }

  clearListeners();
  latestTranscript = '';

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
    setListening(false);
    activeMode = null;
    const code = event.error === 'not-allowed' ? 'VOICE_PERMISSION_DENIED' : 'VOICE_RECOGNITION_FAILED';
    onError?.(code);
    clearListeners();
  });

  endSub = addSpeechRecognitionListener('end', () => {
    setListening(false);
    activeMode = null;
    const text = latestTranscript.trim();
    const handler = onFinal;
    onFinal = null;
    clearListeners();
    handler?.(text);
  });

  setListening(true);
  activeMode = 'os';
  try {
    ExpoSpeechRecognitionModule.start(buildOsSpeechStartOptions(locale));
  } catch (error) {
    setListening(false);
    activeMode = null;
    clearListeners();
    logCaughtError('startOsSpeechDictation.start', error, { level: 'warn' });
    throw error instanceof Error ? error : new Error('VOICE_RECOGNITION_FAILED');
  }
}

async function startCloudMicDictation(locale: string): Promise<void> {
  cloudMicLocale = locale;
  await startMicRecording();
  setListening(true);
  activeMode = 'cloud-mic';
}

/**
 * Starts voice capture from the device microphone.
 * Prefer OS speech recognition; when unavailable and YC STT is on, record mic audio for /api/stt.
 * Never opens a file / document picker.
 */
export async function startVoiceDictation(
  locale: string,
  handlers: {
    onResult: FinalResultHandler;
    onError?: ErrorHandler;
    onStateChange?: StateHandler;
  },
): Promise<VoiceDictationMode> {
  if (listening || isMicRecordingActive()) {
    await cancelVoiceDictation();
  }

  latestTranscript = '';
  onFinal = handlers.onResult;
  onError = handlers.onError ?? null;
  onState = handlers.onStateChange ?? null;

  const mode = resolveVoiceDictationMode();
  if (!mode) {
    throw new Error('VOICE_NOT_SUPPORTED');
  }

  if (mode === 'os') {
    try {
      await startOsSpeechDictation(locale);
      return mode;
    } catch (error) {
      if (!YC_STT_ENABLED) throw error;
      logCaughtError('startVoiceDictation.osFallbackToCloud', error, { level: 'warn' });
      await startCloudMicDictation(locale);
      return 'cloud-mic';
    }
  }

  await startCloudMicDictation(locale);
  return mode;
}

async function finishCloudMicDictation(locale: string): Promise<void> {
  onState?.('processing');
  try {
    const captured = await stopMicRecording();
    setListening(false);
    activeMode = null;

    const result = await recognizeSpeechViaApi({
      audioBase64: captured.audioBase64,
      lang: resolveSpeechLocale(locale),
      format: captured.format,
      sampleRateHertz: captured.sampleRateHertz,
    });

    if (result === null) {
      onError?.('VOICE_NOT_SUPPORTED');
      return;
    }
    if (!result.ok) {
      onError?.(result.status === 401 ? 'VOICE_PERMISSION_DENIED' : 'VOICE_RECOGNITION_FAILED');
      return;
    }

    const handler = onFinal;
    onFinal = null;
    handler?.(result.text.trim());
  } catch (error) {
    setListening(false);
    activeMode = null;
    logCaughtError('finishCloudMicDictation', error, { level: 'warn' });
    const code = error instanceof Error ? error.message : 'VOICE_RECOGNITION_FAILED';
    onError?.(code.startsWith('VOICE_') ? code : 'VOICE_RECOGNITION_FAILED');
  } finally {
    onState?.('idle');
  }
}

/** Stops recognition / mic capture; final text arrives via onResult. */
export async function stopVoiceDictation(locale?: string): Promise<void> {
  if (activeMode === 'cloud-mic' || isMicRecordingActive()) {
    await finishCloudMicDictation(locale || cloudMicLocale);
    return;
  }

  if (!listening) return;
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch (error) {
    logCaughtError('stopVoiceDictation', error, { level: 'warn' });
    setListening(false);
    activeMode = null;
    const text = latestTranscript.trim();
    const handler = onFinal;
    onFinal = null;
    clearListeners();
    handler?.(text);
  }
}

/** Cancels recognition / mic capture without delivering text. */
export async function cancelVoiceDictation(): Promise<void> {
  setListening(false);
  onFinal = null;
  latestTranscript = '';
  clearListeners();

  if (activeMode === 'cloud-mic' || isMicRecordingActive()) {
    activeMode = null;
    await cancelMicRecording();
    onState?.('idle');
    return;
  }

  activeMode = null;
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch (error) {
    logCaughtError('cancelVoiceDictation', error, { level: 'warn' });
  }
  onState?.('idle');
}

export function mergeVoiceIntoField(existing: string, transcript: string): string {
  return appendTranscript(existing, transcript);
}
