import { create } from 'zustand';
import {
  TEXT_SCALE_PRESETS,
  type TextScalePreset,
} from '@/src/constants/typography';
import {
  getPreferCalmMotion,
  getShowWeekRing,
  getTextScalePreset,
  setPreferCalmMotion as persistCalmMotion,
  setShowWeekRing as persistShowWeekRing,
  setTextScalePreset as persistTextScale,
} from '@/src/services/settings-service';
import { trackEvent } from '@/src/services/analytics-service';

interface AppearanceState {
  textScale: TextScalePreset;
  preferCalmMotion: boolean;
  showWeekRing: boolean;
  hydrated: boolean;
  hydrate: () => void;
  setTextScale: (preset: TextScalePreset) => void;
  setPreferCalmMotion: (enabled: boolean) => void;
  setShowWeekRing: (enabled: boolean) => void;
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  textScale: 'regular',
  preferCalmMotion: false,
  showWeekRing: true,
  hydrated: false,
  hydrate: () => {
    set({
      textScale: getTextScalePreset() ?? 'regular',
      preferCalmMotion: getPreferCalmMotion(),
      showWeekRing: getShowWeekRing(),
      hydrated: true,
    });
  },
  setTextScale: (preset) => {
    persistTextScale(preset);
    set({ textScale: preset });
    trackEvent('settings_changed', { setting: 'text_scale', value: preset });
  },
  setPreferCalmMotion: (enabled) => {
    persistCalmMotion(enabled);
    set({ preferCalmMotion: enabled });
    trackEvent('settings_changed', { setting: 'calm_motion', value: enabled ? 'on' : 'off' });
  },
  setShowWeekRing: (enabled) => {
    persistShowWeekRing(enabled);
    set({ showWeekRing: enabled });
    trackEvent('settings_changed', { setting: 'week_ring', value: enabled ? 'on' : 'off' });
  },
}));

export function useTextScaleMultiplier(): number {
  const preset = useAppearanceStore((s) => s.textScale);
  return TEXT_SCALE_PRESETS[preset];
}
