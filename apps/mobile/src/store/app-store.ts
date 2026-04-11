import { create } from 'zustand';
import type { Profile } from '@/src/types';

export type Scenario = 'self' | 'child' | 'both' | null;

interface AppState {
  scenario: Scenario;
  activeProfileId: number | null;
  activeProfile: Profile | null;
  setScenario: (scenario: Scenario) => void;
  setActiveProfileId: (id: number | null) => void;
  setActiveProfile: (profile: Profile | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  scenario: null,
  activeProfileId: null,
  activeProfile: null,
  setScenario: (scenario) => set({ scenario }),
  setActiveProfileId: (activeProfileId) => set({ activeProfileId }),
  setActiveProfile: (activeProfile) => set({ activeProfile }),
}));
