import { create } from 'zustand';
import type { Profile, Scenario } from '@allerguide/core';

interface AppState {
  scenario: Scenario | null;
  activeProfileId: number | null;
  activeProfile: Profile | null;
  setScenario: (scenario: Scenario | null) => void;
  setActiveProfileId: (id: number | null) => void;
  setActiveProfile: (profile: Profile | null) => void;
  resetAppState: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  scenario: null,
  activeProfileId: null,
  activeProfile: null,
  setScenario: (scenario) => set({ scenario }),
  setActiveProfileId: (activeProfileId) => set({ activeProfileId }),
  setActiveProfile: (activeProfile) => set({ activeProfile }),
  resetAppState: () => set({ scenario: null, activeProfileId: null, activeProfile: null }),
}));

export type { Scenario };
