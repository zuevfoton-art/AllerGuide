import { afterEach, describe, expect, it, vi } from 'vitest';

const startMock = vi.fn();
const getSpeechRecognitionServicesMock = vi.fn(() => ['com.google.android.tts']);
const isRecognitionAvailableMock = vi.fn(() => false);

const getPermissionsMock = vi.fn(async () => ({ granted: false, canAskAgain: true }));
const requestPermissionsMock = vi.fn(async () => ({ granted: true }));

vi.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    getPermissionsAsync: (...args: unknown[]) => getPermissionsMock(...(args as [])),
    requestPermissionsAsync: (...args: unknown[]) => requestPermissionsMock(...(args as [])),
    start: (...args: unknown[]) => startMock(...args),
    stop: vi.fn(),
    abort: vi.fn(),
  },
  addSpeechRecognitionListener: vi.fn(() => ({ remove: vi.fn() })),
  getSpeechRecognitionServices: () => getSpeechRecognitionServicesMock(),
  isRecognitionAvailable: () => isRecognitionAvailableMock(),
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

describe('voice-dictation-service', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.EXPO_PUBLIC_YC_STT;
    isRecognitionAvailableMock.mockReturnValue(false);
    getSpeechRecognitionServicesMock.mockReturnValue(['com.google.android.tts']);
    getPermissionsMock.mockResolvedValue({ granted: false, canAskAgain: true });
    requestPermissionsMock.mockResolvedValue({ granted: true });
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

  it('starts Android OS speech without continuous or addsPunctuation', async () => {
    isRecognitionAvailableMock.mockReturnValue(true);
    const { buildOsSpeechStartOptions, startVoiceDictation } = await import(
      './voice-dictation-service'
    );

    expect(buildOsSpeechStartOptions('ru')).toMatchObject({
      continuous: false,
      addsPunctuation: false,
      androidRecognitionServicePackage: 'com.google.android.tts',
    });

    const mode = await startVoiceDictation('ru', { onResult: vi.fn() });
    expect(mode).toBe('os');
    expect(startMock).toHaveBeenCalledWith(
      expect.objectContaining({
        continuous: false,
        addsPunctuation: false,
        androidRecognitionServicePackage: 'com.google.android.tts',
      }),
    );
  });

  it('does not re-request RECORD_AUDIO when already granted', async () => {
    isRecognitionAvailableMock.mockReturnValue(true);
    getPermissionsMock.mockResolvedValue({ granted: true, canAskAgain: true });

    const { startVoiceDictation } = await import('./voice-dictation-service');
    await startVoiceDictation('ru', { onResult: vi.fn() });

    expect(getPermissionsMock).toHaveBeenCalledOnce();
    expect(requestPermissionsMock).not.toHaveBeenCalled();
  });

  it('falls back to cloud mic when OS start throws and YC_STT is on', async () => {
    process.env.EXPO_PUBLIC_YC_STT = 'true';
    isRecognitionAvailableMock.mockReturnValue(true);
    startMock.mockImplementationOnce(() => {
      throw new Error('native-start-failed');
    });

    const { startVoiceDictation } = await import('./voice-dictation-service');
    const { startMicRecording } = await import('./voice-mic-recording-service');

    const mode = await startVoiceDictation('ru', { onResult: vi.fn() });
    expect(mode).toBe('cloud-mic');
    expect(startMicRecording).toHaveBeenCalledOnce();
  });
});
