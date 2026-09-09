import { create } from 'zustand';
import type { HintTourId } from '@allerguide/core';

export type HintAnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HintStepView = {
  id: string;
  anchorId: string;
  title: string;
  body: string;
};

export type ActiveHintTour = {
  tourId: HintTourId;
  stepIndex: number;
  steps: HintStepView[];
};

interface HintsState {
  anchors: Record<string, HintAnchorRect>;
  activeTour: ActiveHintTour | null;
  registerAnchor: (anchorId: string, rect: HintAnchorRect) => void;
  unregisterAnchor: (anchorId: string) => void;
  startTour: (tourId: HintTourId, steps: HintStepView[]) => void;
  goToNextStep: () => void;
  closeTour: () => void;
}

export const useHintsStore = create<HintsState>((set, get) => ({
  anchors: {},
  activeTour: null,
  registerAnchor: (anchorId, rect) =>
    set((state) => ({
      anchors: { ...state.anchors, [anchorId]: rect },
    })),
  unregisterAnchor: (anchorId) =>
    set((state) => {
      if (!(anchorId in state.anchors)) return state;
      const { [anchorId]: _removed, ...rest } = state.anchors;
      return { anchors: rest };
    }),
  startTour: (tourId, steps) => {
    if (get().activeTour) return;
    if (steps.length === 0) return;
    set({ activeTour: { tourId, stepIndex: 0, steps } });
  },
  goToNextStep: () =>
    set((state) => {
      if (!state.activeTour) return state;
      const nextIndex = state.activeTour.stepIndex + 1;
      if (nextIndex >= state.activeTour.steps.length) return state;
      return { activeTour: { ...state.activeTour, stepIndex: nextIndex } };
    }),
  closeTour: () => set({ activeTour: null }),
}));
