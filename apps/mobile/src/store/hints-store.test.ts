import { beforeEach, describe, expect, it } from 'vitest';
import { useHintsStore, type HintStepView } from './hints-store';

const homeSteps: HintStepView[] = [
  { id: 'profile', anchorId: 'home.profile', title: 'Профиль', body: 'Переключение' },
  { id: 'wellness', anchorId: 'home.wellness', title: 'Индекс', body: 'Самочувствие' },
];

describe('hints-store', () => {
  beforeEach(() => {
    useHintsStore.setState({ anchors: {}, activeTour: null });
  });

  it('registers and unregisters an anchor rect', () => {
    useHintsStore.getState().registerAnchor('tab.home', { x: 1, y: 2, width: 10, height: 20 });
    expect(useHintsStore.getState().anchors['tab.home']).toEqual({
      x: 1,
      y: 2,
      width: 10,
      height: 20,
    });
    useHintsStore.getState().unregisterAnchor('tab.home');
    expect(useHintsStore.getState().anchors['tab.home']).toBeUndefined();
  });

  it('starts a tour once and ignores a second start', () => {
    useHintsStore.getState().startTour('home', homeSteps);
    useHintsStore.getState().startTour('diary', [
      { id: 'newEntry', anchorId: 'diary.newEntry', title: 'Запись', body: 'Дневник' },
    ]);
    expect(useHintsStore.getState().activeTour?.tourId).toBe('home');
    expect(useHintsStore.getState().activeTour?.stepIndex).toBe(0);
  });

  it('does not start a tour with no steps', () => {
    useHintsStore.getState().startTour('home', []);
    expect(useHintsStore.getState().activeTour).toBeNull();
  });

  it('advances steps and stops at the last one', () => {
    useHintsStore.getState().startTour('home', homeSteps);
    useHintsStore.getState().goToNextStep();
    expect(useHintsStore.getState().activeTour?.stepIndex).toBe(1);
    useHintsStore.getState().goToNextStep();
    expect(useHintsStore.getState().activeTour?.stepIndex).toBe(1);
    useHintsStore.getState().closeTour();
    expect(useHintsStore.getState().activeTour).toBeNull();
  });
});
