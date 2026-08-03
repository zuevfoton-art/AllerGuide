import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
  },
  addSpeechRecognitionListener: vi.fn(() => ({ remove: vi.fn() })),
  isRecognitionAvailable: vi.fn(() => false),
  supportsOnDeviceRecognition: vi.fn(() => false),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

vi.mock('@/src/services/stt-api-service', () => ({
  recognizeSpeechViaApi: vi.fn(),
}));

vi.mock('@/src/services/voice-mic-recording-service', () => ({
  startMicRecording: vi.fn(async () => undefined),
  stopMicRecording: vi.fn(async () => ({
    audioBase64: 'YWJj',
    format: 'oggopus' as const,
    sampleRateHertz: 16000,
  })),
  cancelMicRecording: vi.fn(async () => undefined),
  isMicRecordingActive: vi.fn(() => false),
}));

describe('voice-dictation-service cloud mic path', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.EXPO_PUBLIC_YC_STT;
  });

  it('uses cloud mic when OS speech is unavailable and YC_STT is on', async () => {
    process.env.EXPO_PUBLIC_YC_STT = 'true';
    const { resolveVoiceDictationMode, isVoiceInputSupported, startVoiceDictation } =
      await import('./voice-dictation-service');
    const { startMicRecording } = await import('./voice-mic-recording-service');

    expect(isVoiceInputSupported()).toBe(true);
    expect(resolveVoiceDictationMode()).toBe('cloud-mic');

    const mode = await startVoiceDictation('ru', {
      onResult: vi.fn(),
    });
    expect(mode).toBe('cloud-mic');
    expect(startMicRecording).toHaveBeenCalledOnce();
  });

  it('is unsupported when OS speech and YC_STT are both off', async () => {
    process.env.EXPO_PUBLIC_YC_STT = 'false';
    const { isVoiceInputSupported, resolveVoiceDictationMode } =
      await import('./voice-dictation-service');
    expect(isVoiceInputSupported()).toBe(false);
    expect(resolveVoiceDictationMode()).toBeNull();
  });
});
