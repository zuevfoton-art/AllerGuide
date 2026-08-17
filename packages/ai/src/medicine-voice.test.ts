import { describe, expect, it } from 'vitest';
import { parseMedicineVoiceUtterance } from './medicine-label';

describe('parseMedicineVoiceUtterance', () => {
  it('extracts name and strength from a spoken dose log', () => {
    const parsed = parseMedicineVoiceUtterance('принял нурофен 200 миллиграмм вечером');
    expect(parsed?.name.toLowerCase()).toBe('нурофен');
    expect(parsed?.strength).toBe('200 мг');
  });

  it('accepts a single medicine name', () => {
    const parsed = parseMedicineVoiceUtterance('Цетиризин');
    expect(parsed?.name).toBe('Цетиризин');
  });

  it('normalizes spoken milliliters and strips a feminine verb', () => {
    const parsed = parseMedicineVoiceUtterance('выпила сироп нурофен 5 миллилитров');
    expect(parsed?.name.toLowerCase()).toContain('нурофен');
    expect(parsed?.form).toBe('сироп');
    expect(parsed?.strength).toBe('5 мл');
  });

  it('returns null for greetings and empty speech', () => {
    expect(parseMedicineVoiceUtterance('')).toBeNull();
    expect(parseMedicineVoiceUtterance('привет')).toBeNull();
    expect(parseMedicineVoiceUtterance('спасибо')).toBeNull();
  });
});
