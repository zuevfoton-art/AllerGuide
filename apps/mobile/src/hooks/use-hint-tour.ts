import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import type { HintTourId } from '@allerguide/core';
import { resolveHintTourSteps } from '@/src/constants/hint-tours';
import { getCurrentUserId } from '@/src/services/auth-service';
import { isHintTourPending, startHintTour } from '@/src/services/first-run-hints-service';
import { useHintsStore } from '@/src/store/hints-store';
import { useTranslation } from '@/src/store/locale-store';

export function useHintTour(tourId: HintTourId, options?: { ready?: boolean }) {
  const ready = options?.ready ?? true;
  const { t } = useTranslation();
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const focusedRef = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;

  const tryStart = useCallback(() => {
    if (!focusedRef.current || !readyRef.current) return;

    const userId = getCurrentUserId();
    if (!userId || !isHintTourPending(userId, tourId)) return;
    if (useHintsStore.getState().activeTour) return;

    const steps = resolveHintTourSteps(tourId, tRef.current);
    if (steps.length === 0) return;

    startHintTour(userId, tourId, steps.length);
    useHintsStore.getState().startTour(tourId, steps);
  }, [tourId]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      tryStart();
      return () => {
        focusedRef.current = false;
        const tour = useHintsStore.getState().activeTour;
        if (tour?.tourId === tourId) {
          useHintsStore.getState().closeTour();
        }
      };
    }, [tryStart, tourId]),
  );

  useEffect(() => {
    if (ready) tryStart();
  }, [ready, tryStart]);
}
