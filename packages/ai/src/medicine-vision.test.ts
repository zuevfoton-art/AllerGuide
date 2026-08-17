import { describe, expect, it } from 'vitest';
import { buildMedicineVisionPrompt, parseMedicineVisionResponse } from './medicine-vision';

describe('medicine vision domain', () => {
  it('builds a JSON-only prompt with age context', () => {
    const prompt = buildMedicineVisionPrompt('ru', 6);
    expect(prompt).toContain('name');
    expect(prompt).toContain('activeSubstance');
    expect(prompt).toContain('6 лет');
  });

  it('parses a clean vision JSON payload', () => {
    const result = parseMedicineVisionResponse(
      JSON.stringify({
        name: 'Нурофен',
        activeSubstance: 'ибупрофен',
        form: 'таблетки',
        strength: '200 мг',
        manufacturer: 'Reckitt',
        indications: 'боль, температура',
        ageUsage: [{ minAgeYears: 12, dose: '200 мг' }],
        minAgeYears: 12,
        ingredients: 'ибупрофен, лактоза',
        allergenTags: ['лактоза'],
        confidence: 'high',
      }),
    );
    expect(result?.name).toBe('Нурофен');
    expect(result?.activeSubstance).toBe('ибупрофен');
    expect(result?.minAgeYears).toBe(12);
    expect(result?.allergenTags).toEqual(['лактоза']);
  });

  it('parses fenced JSON and rejects empty non-medicine payloads', () => {
    expect(
      parseMedicineVisionResponse(
        '```json\n{"name":"Цетрин","activeSubstance":"цетиризин","confidence":"medium"}\n```',
      )?.name,
    ).toBe('Цетрин');
    expect(
      parseMedicineVisionResponse(
        JSON.stringify({ name: '', activeSubstance: '', confidence: 'low', notes: 'not a medicine' }),
      ),
    ).toBeNull();
  });
});
