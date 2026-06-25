import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { appendTranscript, resolveSpeechLocale } from '@allerguide/ai';
import { VOICE_TRANSCRIBE_ENABLED } from '@/src/constants/features';
import { getAuthToken } from '@/src/services/backend-api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export type VoiceDictationState = 'idle' | 'recording' | 'transcribing';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

let recording: Audio.Recording | null = null;
let webRecognition: SpeechRecognitionLike | null = null;
let webTranscript = '';

/** Whether voice dictation is available on this platform. */
export function isVoiceInputSupported(): boolean {
  if (Platform.OS === 'web') {
    return Boolean(getWebSpeechRecognition());
  }
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function getWebSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const win = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

async function transcribeWithApi(input: {
  audioBase64: string;
  mimeType: string;
  locale: string;
}): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      audioBase64: input.audioBase64,
      mimeType: input.mimeType,
      locale: input.locale,
    }),
  });

  const payload = (await response.json()) as { ok?: boolean; text?: string; error?: string };
  if (!response.ok || !payload.ok || !payload.text) {
    throw new Error(payload.error ?? 'Transcription failed');
  }

  return payload.text;
}

async function ensureMicPermission(): Promise<boolean> {
  const permission = await Audio.requestPermissionsAsync();
  return permission.granted;
}

/**
 * Starts voice dictation. On web uses SpeechRecognition; on native records audio for Whisper API.
 */
export async function startVoiceDictation(locale: string): Promise<void> {
  if (Platform.OS === 'web') {
    const Ctor = getWebSpeechRecognition();
    if (!Ctor) {
      throw new Error('VOICE_NOT_SUPPORTED');
    }

    webTranscript = '';
    const recognition = new Ctor();
    recognition.lang = resolveSpeechLocale(locale);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const parts: string[] = [];
      const results = event.results as unknown as ArrayLike<{ [index: number]: { transcript: string } }>;
      for (let i = 0; i < results.length; i += 1) {
        parts.push(results[i]?.[0]?.transcript ?? '');
      }
      webTranscript = parts.join(' ').trim();
    };
    webRecognition = recognition;
    recognition.start();
    return;
  }

  const granted = await ensureMicPermission();
  if (!granted) {
    throw new Error('VOICE_PERMISSION_DENIED');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const nextRecording = new Audio.Recording();
  await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await nextRecording.startAsync();
  recording = nextRecording;
}

/**
 * Stops dictation and returns transcribed text (appended to optional existing value by caller).
 */
export async function stopVoiceDictation(locale: string): Promise<string> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const recognition = webRecognition;
      if (!recognition) {
        resolve(webTranscript);
        return;
      }

      recognition.onend = () => {
        webRecognition = null;
        resolve(webTranscript.trim());
      };
      recognition.onerror = () => {
        webRecognition = null;
        reject(new Error('VOICE_RECOGNITION_FAILED'));
      };

      try {
        recognition.stop();
      } catch {
        webRecognition = null;
        resolve(webTranscript.trim());
      }
    });
  }

  const active = recording;
  recording = null;
  if (!active) return '';

  await active.stopAndUnloadAsync();
  const uri = active.getURI();
  if (!uri) return '';

  if (!VOICE_TRANSCRIBE_ENABLED) {
    throw new Error('VOICE_CLOUD_REQUIRED');
  }

  const audioBase64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const text = await transcribeWithApi({
    audioBase64,
    mimeType: 'audio/m4a',
    locale,
  });

  await FileSystem.deleteAsync(uri, { idempotent: true });
  return text.trim();
}

/** Cancels an in-progress dictation without returning text. */
export async function cancelVoiceDictation(): Promise<void> {
  if (Platform.OS === 'web') {
    webRecognition?.abort();
    webRecognition = null;
    webTranscript = '';
    return;
  }

  const active = recording;
  recording = null;
  if (!active) return;

  try {
    await active.stopAndUnloadAsync();
    const uri = active.getURI();
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore cleanup errors
  }
}

/** Merges dictation result into an existing text field value. */
export function mergeVoiceIntoField(existing: string, transcript: string): string {
  return appendTranscript(existing, transcript);
}
