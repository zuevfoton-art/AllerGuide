import { create } from 'zustand';
import type { ThemeMode } from '@/src/constants/theme';
import { getThemeMode, setThemeMode as persistThemeMode } from '@/src/services/settings-service';
import { trackEvent } from '@/src/services/analytics-service';

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  hydrate: () => void;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  hydrated: false,
  hydrate: () => {
    const stored = getThemeMode();
    set({ mode: stored ?? 'system', hydrated: true });
  },
  setMode: (mode) => {
    persistThemeMode(mode);
    set({ mode });
    trackEvent('settings_changed', { setting: 'theme', value: mode });
  },
  toggleDark: () => {
    const next = get().mode === 'dark' ? 'light' : 'dark';
    get().setMode(next);
  },
}));
