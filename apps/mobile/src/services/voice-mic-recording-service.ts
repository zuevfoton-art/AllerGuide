/**
 * Device-microphone recording for cloud STT (Yandex SpeechKit).
 * Always uses the system mic — never DocumentPicker / gallery / files.
 */
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
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

let activeRecording: Audio.Recording | null = null;

/**
 * SpeechKit-compatible capture options.
 * Avoid undocumented Android MediaRecorder constants (e.g. OGG/OPUS magic numbers):
 * invalid combos can native-crash and bypass JS try/catch.
 */
function sttRecordingOptions(): Audio.RecordingOptions {
  if (Platform.OS === 'ios') {
    return {
      isMeteringEnabled: true,
      android: Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
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
        mimeType: 'audio/webm;codecs=opus',
        bitsPerSecond: 24_000,
      },
    };
  }

  // Android / web fallback: only documented expo-av presets (MPEG4/AAC on Android).
  // AAC is not SpeechKit sync-format; OS speech is preferred on Android.
  return {
    isMeteringEnabled: true,
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
    web: {
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

function uriLooksLikeWav(uri: string): boolean {
  return /\.wav($|\?)/i.test(uri);
}

function uriLooksLikeOgg(uri: string): boolean {
  return /\.ogg($|\?)/i.test(uri) || /\.opus($|\?)/i.test(uri);
}

/**
 * Starts capturing audio from the device microphone.
 * Throws VOICE_PERMISSION_DENIED when the user denies mic access.
 */
export async function startMicRecording(): Promise<void> {
  if (activeRecording) {
    await cancelMicRecording();
  }

  // On Android request via RN core PermissionsAndroid: resolving an
  // expo-modules-core (SDK 53) promise after the permission activity
  // round-trip can SIGSEGV (see ensureRecordAudioPermission in
  // voice-dictation-service). Elsewhere use expo-av permissions.
  let granted = false;
  if (Platform.OS === 'android') {
    const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    granted =
      (await PermissionsAndroid.check(permission)) ||
      (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED;
  } else {
    try {
      const current = await Audio.getPermissionsAsync();
      granted = current.granted;
    } catch (error) {
      logCaughtError('startMicRecording.getPermissions', error, { level: 'warn' });
    }
    if (!granted) {
      const permission = await Audio.requestPermissionsAsync();
      granted = permission.granted;
    }
  }
  if (!granted) {
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
  await recording.prepareToRecordAsync(sttRecordingOptions());
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

  if (Platform.OS === 'ios' || uriLooksLikeWav(uri)) {
    return {
      audioBase64: stripWavHeaderToPcmBase64(rawBase64),
      format: 'lpcm',
      sampleRateHertz: STT_SAMPLE_RATE_HZ,
    };
  }

  if (uriLooksLikeOgg(uri) || Platform.OS === 'web') {
    return {
      audioBase64: rawBase64,
      format: 'oggopus',
      sampleRateHertz: STT_SAMPLE_RATE_HZ,
    };
  }

  // Android HIGH_QUALITY is typically AAC/m4a — not a SpeechKit sync format.
  logCaughtError(
    'stopMicRecording.unsupportedFormat',
    new Error(`Unsupported mic capture URI for SpeechKit: ${uri}`),
    { level: 'warn' },
  );
  throw new Error('VOICE_RECOGNITION_FAILED');
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
      // ignore cleanup failures for temp mic files
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
