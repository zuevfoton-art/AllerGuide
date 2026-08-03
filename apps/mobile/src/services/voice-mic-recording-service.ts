/**
 * Device-microphone recording for cloud STT (Yandex SpeechKit).
 * Always uses the system mic — never DocumentPicker / gallery / files.
 *
 * Uses `expo-audio` (the maintained SDK 53 replacement for the deprecated
 * `expo-av`). `expo-av` failed to install its JSI bindings on release builds
 * ("Cannot install JSI bindings for AV module"), which crashed the app with a
 * native SIGSEGV in libexpo-modules-core.so on first module access.
 */
import {
  AudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  IOSOutputFormat,
  AudioQuality,
  type RecordingOptions,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { PermissionsAndroid, Platform } from 'react-native';
import { logCaughtError } from '@/src/services/error-reporting';

const STT_SAMPLE_RATE_HZ = 16_000;

export type MicRecordingFormat = 'lpcm' | 'oggopus';

export type MicRecordingResult = {
  audioBase64: string;
  format: MicRecordingFormat;
  sampleRateHertz: number;
};

let activeRecorder: AudioRecorder | null = null;

/** SpeechKit-friendly capture options for expo-audio. */
function sttRecordingOptions(): RecordingOptions {
  const base = RecordingPresets.HIGH_QUALITY;
  return {
    ...base,
    extension: Platform.OS === 'ios' ? '.wav' : base.extension,
    sampleRate: STT_SAMPLE_RATE_HZ,
    numberOfChannels: 1,
    bitRate: 64_000,
    android: {
      ...base.android,
      sampleRate: STT_SAMPLE_RATE_HZ,
    },
    ios: {
      ...base.ios,
      extension: '.wav',
      outputFormat: IOSOutputFormat.LINEARPCM,
      audioQuality: AudioQuality.HIGH,
      sampleRate: STT_SAMPLE_RATE_HZ,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  };
}

async function activateRecordingAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'doNotMix',
    interruptionModeAndroid: 'doNotMix',
    shouldRouteThroughEarpiece: false,
  });
}

async function deactivateRecordingAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'doNotMix',
    interruptionModeAndroid: 'doNotMix',
    shouldRouteThroughEarpiece: false,
  });
}

/** Strip RIFF/WAVE header so SpeechKit `format=lpcm` receives raw PCM. */
export function stripWavHeaderToPcmBase64(wavBase64: string): string {
  const binary = globalThis.atob(wavBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const isRiff =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45;

  if (!isRiff) {
    return wavBase64;
  }

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    const size =
      bytes[offset + 4] |
      (bytes[offset + 5] << 8) |
      (bytes[offset + 6] << 16) |
      (bytes[offset + 7] << 24);
    const dataStart = offset + 8;
    if (id === 'data') {
      const pcm = bytes.subarray(dataStart, Math.min(dataStart + size, bytes.length));
      let out = '';
      const chunk = 0x8000;
      for (let i = 0; i < pcm.length; i += chunk) {
        out += String.fromCharCode(...pcm.subarray(i, i + chunk));
      }
      return globalThis.btoa(out);
    }
    offset = dataStart + size;
  }

  return wavBase64;
}

export function isMicRecordingActive(): boolean {
  return activeRecorder !== null;
}

function uriLooksLikeWav(uri: string): boolean {
  return /\.wav($|\?)/i.test(uri);
}

async function requestRecordAudioPermission(): Promise<boolean> {
  // Android: request via RN core PermissionsAndroid (avoids the expo-modules
  // permission JSI path). iOS/web are handled by expo-audio recording itself.
  if (Platform.OS === 'android') {
    const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    if (await PermissionsAndroid.check(permission)) return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

/**
 * Starts capturing audio from the device microphone.
 * Throws VOICE_PERMISSION_DENIED when the user denies mic access.
 */
export async function startMicRecording(): Promise<void> {
  if (activeRecorder) {
    await cancelMicRecording();
  }

  if (!(await requestRecordAudioPermission())) {
    throw new Error('VOICE_PERMISSION_DENIED');
  }

  await activateRecordingAudioMode();

  const recorder = new AudioRecorder(sttRecordingOptions());
  await recorder.prepareToRecordAsync();
  recorder.record();
  activeRecorder = recorder;
}

/**
 * Stops mic capture and returns base64 audio for `/api/stt`.
 * Does not read from the user file store / gallery.
 */
export async function stopMicRecording(): Promise<MicRecordingResult> {
  const recorder = activeRecorder;
  if (!recorder) {
    throw new Error('VOICE_RECOGNITION_FAILED');
  }

  activeRecorder = null;
  try {
    await recorder.stop();
  } catch (error) {
    logCaughtError('stopMicRecording.stop', error, { level: 'warn' });
  }

  const uri = recorder.uri;
  if (!uri) {
    await deactivateRecordingAudioMode();
    throw new Error('VOICE_RECOGNITION_FAILED');
  }

  const rawBase64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64' as never,
  });

  // Best-effort cleanup of the temp capture file (still app cache, not user library).
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (error) {
    logCaughtError('stopMicRecording.cleanup', error, { level: 'warn' });
  }

  await deactivateRecordingAudioMode();

  if (Platform.OS === 'ios' || uriLooksLikeWav(uri)) {
    return {
      audioBase64: stripWavHeaderToPcmBase64(rawBase64),
      format: 'lpcm',
      sampleRateHertz: STT_SAMPLE_RATE_HZ,
    };
  }

  // Android HIGH_QUALITY is AAC/m4a — not a SpeechKit sync format. OS speech
  // recognition is the primary Android path; cloud mic here is best-effort.
  logCaughtError(
    'stopMicRecording.unsupportedFormat',
    new Error(`Unsupported mic capture URI for SpeechKit: ${uri}`),
    { level: 'warn' },
  );
  throw new Error('VOICE_RECOGNITION_FAILED');
}

/** Aborts capture without returning audio. */
export async function cancelMicRecording(): Promise<void> {
  const recorder = activeRecorder;
  activeRecorder = null;
  if (!recorder) return;

  try {
    await recorder.stop();
  } catch (error) {
    logCaughtError('cancelMicRecording', error, { level: 'warn' });
  }

  const uri = recorder.uri;
  if (uri) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore cleanup failures for temp mic files
    }
  }

  try {
    await deactivateRecordingAudioMode();
  } catch (error) {
    logCaughtError('cancelMicRecording.audioMode', error, { level: 'warn' });
  }
}
