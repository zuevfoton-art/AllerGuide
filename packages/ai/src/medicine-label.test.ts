import { describe, expect, it } from 'vitest';
import { getDemoMedicineLabelText, hasMedicinePackageLabelSignal, parseMedicineLabelText } from './medicine-label';

describe('medicine label parse', () => {
  it('extracts name, substance, form and strength from a Russian label', () => {
    const parsed = parseMedicineLabelText(getDemoMedicineLabelText());
    expect(parsed?.name).toBe('Нурофен');
    expect(parsed?.activeSubstance).toMatch(/ибупрофен/i);
    expect(parsed?.strength).toBe('200 мг');
    expect(parsed?.form.toLowerCase()).toContain('таблет');
    expect(parsed?.ingredients).toMatch(/лактоза/i);
  });

  it('returns null for empty or unrelated text', () => {
    expect(parseMedicineLabelText('')).toBeNull();
    expect(parseMedicineLabelText('привет')).toBeNull();
  });

  it('treats tablet packs as medicine and ignores food nutrition lines', () => {
    expect(hasMedicinePackageLabelSignal(getDemoMedicineLabelText())).toBe(true);
    expect(hasMedicinePackageLabelSignal('Йогурт. Белок 10 г, жир 3 г')).toBe(false);
    expect(hasMedicinePackageLabelSignal('Nivea crème. Aqua, Glycerin, gel')).toBe(false);
  });
});
