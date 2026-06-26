import { describe, expect, it } from 'vitest';
import {
  enrichSymptomAnswers,
  inferSymptomCodesFromText,
  resolveSymptomCodes,
  formatCodedSymptomsSummary,
} from './symptom-coding';

describe('symptom-coding (C.1)', () => {
  it('infers codes from free text', () => {
    expect(inferSymptomCodesFromText('зуд глаз и чихание')).toEqual(
      expect.arrayContaining(['ocular-itching', 'sneezing']),
    );
  });

  it('enriches answers with SNOMED and ICD fields', () => {
    const enriched = enrichSymptomAnswers({
      symptoms: 'чихание',
      symptomCode: 'Чихание',
    });
    expect(enriched.symptomCodes).toContain('sneezing');
    expect(enriched.symptomSnomed).toContain('76067001');
    expect(enriched.symptomIcd11).toContain('MD11.0');
  });

  it('formats coded summary', () => {
    const codes = resolveSymptomCodes({ symptomCode: 'Кашель', symptoms: 'кашель' });
    expect(formatCodedSymptomsSummary(codes)).toContain('SNOMED');
  });
});
