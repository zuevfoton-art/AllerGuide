import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_CONTACT_RELATIONS,
  getEmergencyContactRelationLabel,
  isEmergencyContactRelation,
} from './emergency-contacts';

describe('emergency contacts', () => {
  it('exposes relation options for profile UI', () => {
    expect(EMERGENCY_CONTACT_RELATIONS.map((item) => item.label)).toEqual([
      'Родственник',
      'Доверенное лицо',
      'Врач',
    ]);
  });

  it('returns Russian labels for relation keys', () => {
    expect(getEmergencyContactRelationLabel('doctor')).toBe('Врач');
    expect(getEmergencyContactRelationLabel('trusted')).toBe('Доверенное лицо');
  });

  it('validates relation keys', () => {
    expect(isEmergencyContactRelation('relative')).toBe(true);
    expect(isEmergencyContactRelation('unknown')).toBe(false);
  });
});
