import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPassport } from '@allerguide/core';
import {
  getAllergyPassport,
  resetAllergyPassport,
  saveAllergyPassport,
} from './sos-passport-service';

const settings = new Map<string, string>();

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => settings.get(key) ?? '',
  setSetting: (key: string, value: string) => {
    settings.set(key, value);
  },
}));

describe('sos-passport-service', () => {
  beforeEach(() => {
    settings.clear();
  });

  it('returns default passport when none saved', () => {
    const passport = getAllergyPassport(1);
    expect(passport.v).toBe(1);
    expect(passport.shockKit.length).toBeGreaterThan(0);
  });

  it('persists passport per profile id', () => {
    const passport = createDefaultPassport();
    passport.triggers = ['Пыльца'];
    saveAllergyPassport(2, passport);

    expect(getAllergyPassport(2).triggers).toEqual(['Пыльца']);
    expect(getAllergyPassport(3).triggers).toEqual([]);
  });

  it('resets passport to defaults', () => {
    const passport = createDefaultPassport();
    passport.drugIntolerances = ['Аспирин'];
    saveAllergyPassport(4, passport);

    resetAllergyPassport(4);
    expect(getAllergyPassport(4).drugIntolerances).toEqual([]);
  });
});
