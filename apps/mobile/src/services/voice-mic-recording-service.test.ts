import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: vi.fn(),
    setAudioModeAsync: vi.fn(),
    Recording: vi.fn(),
    RecordingOptionsPresets: { HIGH_QUALITY: { android: {}, ios: {} } },
    IOSOutputFormat: { LINEARPCM: 'lpcm' },
    IOSAudioQuality: { HIGH: 96 },
    AndroidOutputFormat: {},
    AndroidAudioEncoder: {},
  },
  InterruptionModeAndroid: { DoNotMix: 1 },
  InterruptionModeIOS: { DoNotMix: 1 },
}));

vi.mock('expo-file-system', () => ({
  readAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

function makeSilentWavBase64(frames = 100): string {
  const dataSize = frames * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(16000, 24);
  buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer.toString('base64');
}

describe('stripWavHeaderToPcmBase64', () => {
  let stripWavHeaderToPcmBase64: (wavBase64: string) => string;

  beforeAll(async () => {
    ({ stripWavHeaderToPcmBase64 } = await import('./voice-mic-recording-service'));
  });

  it('strips RIFF/WAVE header to raw PCM', () => {
    const wavB64 = makeSilentWavBase64(8);
    const pcmB64 = stripWavHeaderToPcmBase64(wavB64);
    const pcm = Buffer.from(pcmB64, 'base64');
    expect(pcm.length).toBe(16);
    expect(pcm.subarray(0, 4).toString('ascii')).not.toBe('RIFF');
  });

  it('passes through non-WAV payloads', () => {
    const raw = Buffer.from('not-a-wav-payload!!').toString('base64');
    expect(stripWavHeaderToPcmBase64(raw)).toBe(raw);
  });
});
