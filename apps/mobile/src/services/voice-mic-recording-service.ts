/**
 * Device-microphone recording for cloud STT (Yandex SpeechKit).
 * Always uses the system mic — never DocumentPicker / gallery / files.
 */
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { logCaughtError } from '@/src/services/error-reporting';

/** Android MediaRecorder OutputFormat.OGG (API 29+) — not in expo-av enum yet. */
const ANDROID_OUTPUT_OGG = 11;
/** Android MediaRecorder AudioEncoder.OPUS (API 29+). */
const ANDROID_ENCODER_OPUS = 7;

const STT_SAMPLE_RATE_HZ = 16_000;

export type MicRecordingFormat = 'lpcm' | 'oggopus';

export type MicRecordingResult = {
  audioBase64: string;
  format: MicRecordingFormat;
  sampleRateHertz: number;
};

let activeRecording: Audio.Recording | null = null;

function sttRecordingOptions(): Audio.RecordingOptions {
  return {
    isMeteringEnabled: true,
    android: {
      // Prefer OggOpus for SpeechKit sync STT on Android 10+.
      extension: '.ogg',
      outputFormat: ANDROID_OUTPUT_OGG as Audio.AndroidOutputFormat,
      audioEncoder: ANDROID_ENCODER_OPUS as Audio.AndroidAudioEncoder,
      sampleRate: STT_SAMPLE_RATE_HZ,
      numberOfChannels: 1,
      bitRate: 24_000,
    },
    ios: {
      extension: '.wav',
      outputFormat: Audio.IOSOutputFormat.LINEARPCM,
      audioQuality: Audio.IOSAudioQuality.HIGH,
      sampleRate: STT_SAMPLE_RATE_HZ,
      numberOfChannels: 1,
      bitRate: 256_000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      // Best-effort; Chromium typically records Opus in WebM.
      mimeType: 'audio/webm;codecs=opus',
      bitsPerSecond: 24_000,
    },
  };
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
  return activeRecording !== null;
}

/**
 * Starts capturing audio from the device microphone.
 * Throws VOICE_PERMISSION_DENIED when the user denies mic access.
 */
export async function startMicRecording(): Promise<void> {
  if (activeRecording) {
    await cancelMicRecording();
  }

  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('VOICE_PERMISSION_DENIED');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  const recording = new Audio.Recording();
  try {
    await recording.prepareToRecordAsync(sttRecordingOptions());
  } catch (error) {
    // Older Android without OGG/OPUS — fall back to AAC/m4a (API may reject; OS STT is preferred).
    logCaughtError('startMicRecording.prepareOgg', error, { level: 'warn' });
    await recording.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      android: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
        sampleRate: STT_SAMPLE_RATE_HZ,
        numberOfChannels: 1,
        bitRate: 64_000,
      },
      ios: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
        sampleRate: STT_SAMPLE_RATE_HZ,
        numberOfChannels: 1,
      },
    });
  }

  await recording.startAsync();
  activeRecording = recording;
}

/**
 * Stops mic capture and returns base64 audio for `/api/stt`.
 * Does not read from the user file store / gallery.
 */
export async function stopMicRecording(): Promise<MicRecordingResult> {
  const recording = activeRecording;
  if (!recording) {
    throw new Error('VOICE_RECOGNITION_FAILED');
  }

  activeRecording = null;
  try {
    await recording.stopAndUnloadAsync();
  } catch (error) {
    logCaughtError('stopMicRecording.stop', error, { level: 'warn' });
  }

  const uri = recording.getURI();
  if (!uri) {
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

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  if (Platform.OS === 'ios' || uri.endsWith('.wav')) {
    return {
      audioBase64: stripWavHeaderToPcmBase64(rawBase64),
      format: 'lpcm',
      sampleRateHertz: STT_SAMPLE_RATE_HZ,
    };
  }

  return {
    audioBase64: rawBase64,
    format: 'oggopus',
    sampleRateHertz: STT_SAMPLE_RATE_HZ,
  };
}

/** Aborts capture without returning audio. */
export async function cancelMicRecording(): Promise<void> {
  const recording = activeRecording;
  activeRecording = null;
  if (!recording) return;

  try {
    const status = await recording.getStatusAsync();
    if (status.isRecording || status.canRecord) {
      await recording.stopAndUnloadAsync();
    }
  } catch (error) {
    logCaughtError('cancelMicRecording', error, { level: 'warn' });
  }

  const uri = recording.getURI();
  if (uri) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore
    }
  }

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    logCaughtError('cancelMicRecording.audioMode', error, { level: 'warn' });
  }
}
