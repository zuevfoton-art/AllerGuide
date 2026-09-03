import { vi } from 'vitest';

// token-session / api-client import Platform. The real RN entry is Flow and
// cannot be parsed by Vite. Tests that need a specific OS still override this.
vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

// Keep expo-secure-store off the Vitest graph. The real module pulls
// expo-modules-core, which reads RN globals (__DEV__, globalThis.expo).
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}));
