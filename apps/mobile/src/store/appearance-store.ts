import { create } from 'zustand';
import {
  TEXT_SCALE_PRESETS,
  type TextScalePreset,
} from '@/src/constants/typography';
import {
  getPreferCalmMotion,
  getTextScalePreset,
  setPreferCalmMotion as persistCalmMotion,
  setTextScalePreset as persistTextScale,
} from '@/src/services/settings-service';
import { trackEvent } from '@/src/services/analytics-service';

interface AppearanceState {
  textScale: TextScalePreset;
  preferCalmMotion: boolean;
  hydrated: boolean;
  hydrate: () => void;
  setTextScale: (preset: TextScalePreset) => void;
  setPreferCalmMotion: (enabled: boolean) => void;
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  textScale: 'regular',
  preferCalmMotion: false,
  hydrated: false,
  hydrate: () => {
    set({
      textScale: getTextScalePreset() ?? 'regular',
      preferCalmMotion: getPreferCalmMotion(),
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
}));

export function useTextScaleMultiplier(): number {
  const preset = useAppearanceStore((s) => s.textScale);
  return TEXT_SCALE_PRESETS[preset];
}
