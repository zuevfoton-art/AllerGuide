import { describe, expect, it } from 'vitest';
import { HINT_TOUR_IDS } from '@allerguide/core';
import { LOCALE_MESSAGES } from '@/src/i18n/locales';
import { getMessage } from '@/src/i18n/translate';
import { HINT_TOURS, resolveHintTourSteps } from './hint-tours';

describe('hint-tours', () => {
  it('defines a non-empty step list for every known tour', () => {
    for (const tourId of HINT_TOUR_IDS) {
      expect(HINT_TOURS[tourId].length).toBeGreaterThan(0);
    }
  });

  it('keeps step ids unique within a tour', () => {
    for (const [tourId, steps] of Object.entries(HINT_TOURS)) {
      const ids = steps.map((step) => step.id);
      expect(new Set(ids).size, tourId).toBe(ids.length);
    }
  });

  it('resolves every title and body key in all six locales', () => {
    for (const locale of Object.values(LOCALE_MESSAGES)) {
      for (const tourId of HINT_TOUR_IDS) {
        const steps = resolveHintTourSteps(tourId, (key) => getMessage(locale, key));
        for (const step of steps) {
          expect(step.title, step.id).not.toBe('');
          expect(step.body, step.id).not.toBe('');
          expect(step.title.includes('hints.tours'), step.title).toBe(false);
          expect(step.body.includes('hints.tours'), step.body).toBe(false);
        }
      }
    }
  });
});
