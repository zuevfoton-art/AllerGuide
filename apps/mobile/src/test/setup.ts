// Expo modules read this at import time. Node/Vitest has no RN global.
(globalThis as { __DEV__?: boolean }).__DEV__ = false;
