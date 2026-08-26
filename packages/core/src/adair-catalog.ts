import bundledRegistry from './data/adair-registry.json';

export type AdairSpecialization =
  | 'pediatric-allergist'
  | 'adult-allergist'
  | 'immunologist'
  | 'pulmonologist';

export type AdairVerification =
  | 'confirmed'
  | 'address-confirmed'
  | 'needs-review'
  | 'unconfirmed';

export type AdairGeocodePrecision = 'address' | 'organization' | 'normalized-address' | 'none';

export interface AdairProvenance {
  doctor?: string;
  address?: string;
  coordinates?: string;
  phone?: string;
}

export interface AdairClinic {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  /** First usable phone, then first listed number. */
  phone?: string;
  phones: string[];
  phonePurpose?: string;
  phoneUsable: boolean;
  bookingUrl?: string;
  verified: boolean;
  isNkcc?: boolean;
  verification: AdairVerification;
  geocodePrecision: AdairGeocodePrecision;
  orgType?: string;
  sources?: AdairProvenance;
  checkedAt?: string;
  geocodedAt?: string;
  phoneCheckedAt?: string;
}

export interface AdairDoctor {
  id: string;
  name: string;
  degree: string;
  role?: string;
  section?: string;
  specialization?: AdairSpecialization;
  clinicId: string;
  adairMember: boolean;
  isChiefExpert?: boolean;
  phone?: string;
  bookingUrl?: string;
  verification?: AdairVerification;
}

export const ADAIR_SPECIALIZATION_LABELS: Record<AdairSpecialization, string> = {
  'pediatric-allergist': 'Детский аллерголог',
  'adult-allergist': 'Взрослый аллерголог',
  immunologist: 'Иммунолог',
  pulmonologist: 'Пульмонолог',
};

const YO_RE = /ё/g;

function foldYo(value: string): string {
  return value.trim().toLowerCase().replace(YO_RE, 'е');
}

export function normalizeAdairVerification(raw: string): AdairVerification {
  const text = foldYo(raw);
  if (text.startsWith('подтверждено')) return 'confirmed';
  if (text.startsWith('адрес подтвержден') || text.startsWith('адрес официальный')) {
    return 'address-confirmed';
  }
  if (text.includes('закрыт') || text.includes('не подтвержд') || text.includes('не установл')) {
    return 'unconfirmed';
  }
  return 'needs-review';
}

export function normalizeGeocodePrecision(raw: string): AdairGeocodePrecision {
  const text = foldYo(raw);
  if (text.includes('точному адресу')) return 'address';
  if (text.includes('названию организации')) return 'organization';
  if (text.includes('нормализован')) return 'normalized-address';
  return 'none';
}

export function normalizeAdairPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) return trimmed;
  let national = digits;
  if (national.length === 11 && (national.startsWith('8') || national.startsWith('7'))) {
    national = national.slice(1);
  }
  if (national.length !== 10) return trimmed.startsWith('+') ? trimmed : `+${digits}`;
  return `+7 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 8)}-${national.slice(8)}`;
}

export function parseAdairPhones(raw: string): string[] {
  return raw
    .split(';')
    .map((part) => normalizeAdairPhone(part))
    .filter(Boolean);
}

export function isUsableAdairPhone(status: string, purpose = ''): boolean {
  return !`${foldYo(status)} ${foldYo(purpose)}`.includes('архивн');
}

export function clinicHasMapPin(clinic: AdairClinic): boolean {
  return (
    clinic.verification !== 'unconfirmed' &&
    clinic.latitude != null &&
    clinic.longitude != null &&
    Number.isFinite(clinic.latitude) &&
    Number.isFinite(clinic.longitude)
  );
}

function firstDisplayPhone(phones: string[], phoneUsable: boolean): string | undefined {
  if (phones.length === 0) return undefined;
  if (!phoneUsable) return phones[0];
  return phones[0];
}

interface BundledClinic {
  id: string;
  name: string;
  address: string;
  city: string;
  orgType?: string;
  latitude: number | null;
  longitude: number | null;
  phones: string[];
  phonePurpose?: string;
  phoneUsable: boolean;
  verification: AdairVerification;
  geocodePrecision: AdairGeocodePrecision;
  isNkcc?: boolean;
  sources?: AdairProvenance;
  checkedAt?: string;
  geocodedAt?: string;
  phoneCheckedAt?: string;
}

interface BundledDoctor {
  id: string;
  name: string;
  degree?: string;
  role?: string;
  section?: string;
  clinicId: string;
  adairMember?: boolean;
  isChiefExpert?: boolean;
  phone?: string;
  verification?: AdairVerification;
}

interface BundledRegistry {
  meta?: { disclaimer?: string };
  clinics: BundledClinic[];
  doctors: BundledDoctor[];
}

function loadClinics(rows: BundledClinic[]): AdairClinic[] {
  return rows.map((row) => {
    const phones = row.phones.map((phone) => normalizeAdairPhone(phone)).filter(Boolean);
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      city: row.city,
      latitude: row.latitude,
      longitude: row.longitude,
      phones,
      phone: firstDisplayPhone(phones, row.phoneUsable),
      phonePurpose: row.phonePurpose,
      phoneUsable: row.phoneUsable,
      verified: row.verification === 'confirmed',
      isNkcc: row.isNkcc,
      verification: row.verification,
      geocodePrecision: row.geocodePrecision,
      orgType: row.orgType,
      sources: row.sources,
      checkedAt: row.checkedAt,
      geocodedAt: row.geocodedAt,
      phoneCheckedAt: row.phoneCheckedAt,
    };
  });
}

function loadDoctors(rows: BundledDoctor[]): AdairDoctor[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    degree: row.degree ?? '',
    role: row.role,
    section: row.section,
    clinicId: row.clinicId,
    adairMember: row.adairMember ?? true,
    isChiefExpert: row.isChiefExpert,
    phone: row.phone,
    verification: row.verification,
  }));
}

const registry = bundledRegistry as BundledRegistry;

export const ADAIR_REGISTRY_DISCLAIMER = registry.meta?.disclaimer ?? '';

export const ADAIR_CLINICS: AdairClinic[] = loadClinics(registry.clinics);
export const ADAIR_DOCTORS: AdairDoctor[] = loadDoctors(registry.doctors);

export function getAdairClinic(id: string): AdairClinic | undefined {
  return ADAIR_CLINICS.find((clinic) => clinic.id === id);
}

export function getDoctorsForClinic(clinicId: string): AdairDoctor[] {
  return ADAIR_DOCTORS.filter((doctor) => doctor.clinicId === clinicId);
}

export function filterAdairDoctors(filters: {
  city?: string;
  specialization?: AdairSpecialization;
}): AdairDoctor[] {
  return ADAIR_DOCTORS.filter((doctor) => {
    if (filters.specialization && doctor.specialization !== filters.specialization) return false;
    if (filters.city) {
      const clinic = getAdairClinic(doctor.clinicId);
      if (!clinic || clinic.city !== filters.city) return false;
    }
    return true;
  });
}

export function searchAdairClinics(query: string): AdairClinic[] {
  const needle = foldYo(query);
  if (needle.length < 2) return ADAIR_CLINICS.filter(clinicHasMapPin);
  return ADAIR_CLINICS.filter((clinic) => {
    if (!clinicHasMapPin(clinic)) return false;
    if (foldYo(clinic.name).includes(needle) || foldYo(clinic.address).includes(needle)) {
      return true;
    }
    return getDoctorsForClinic(clinic.id).some((doctor) => foldYo(doctor.name).includes(needle));
  });
}
