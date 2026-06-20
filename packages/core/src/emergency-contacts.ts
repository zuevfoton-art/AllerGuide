export type EmergencyContactRelation = 'relative' | 'trusted' | 'doctor';

export const EMERGENCY_CONTACT_RELATIONS: { key: EmergencyContactRelation; label: string }[] = [
  { key: 'relative', label: 'Родственник' },
  { key: 'trusted', label: 'Доверенное лицо' },
  { key: 'doctor', label: 'Врач' },
];

export interface EmergencyContact {
  id: number;
  profileId: number;
  name: string;
  phone: string;
  relation: EmergencyContactRelation;
}

export interface EmergencyContactInput {
  name: string;
  phone: string;
  relation: EmergencyContactRelation;
}

export function getEmergencyContactRelationLabel(relation: string): string {
  return EMERGENCY_CONTACT_RELATIONS.find((item) => item.key === relation)?.label ?? relation;
}

export function isEmergencyContactRelation(value: string): value is EmergencyContactRelation {
  return EMERGENCY_CONTACT_RELATIONS.some((item) => item.key === value);
}
