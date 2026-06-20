export type AdairSpecialization =
  | 'pediatric-allergist'
  | 'adult-allergist'
  | 'immunologist'
  | 'pulmonologist';

export interface AdairClinic {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  bookingUrl?: string;
  verified: boolean;
  isNkcc?: boolean;
}

export interface AdairDoctor {
  id: string;
  name: string;
  degree: string;
  specialization: AdairSpecialization;
  clinicId: string;
  adairMember: boolean;
  isChiefExpert?: boolean;
  phone?: string;
  bookingUrl?: string;
}

export const ADAIR_SPECIALIZATION_LABELS: Record<AdairSpecialization, string> = {
  'pediatric-allergist': 'Детский аллерголог',
  'adult-allergist': 'Взрослый аллерголог',
  immunologist: 'Иммунолог',
  pulmonologist: 'Пульмонолог',
};

export const ADAIR_CLINICS: AdairClinic[] = [
  {
    id: 'nkcc',
    name: 'НККЦ',
    address: 'г. Москва, ул. Каширское ш., 24',
    city: 'Москва',
    latitude: 55.653,
    longitude: 37.647,
    phone: '+7 (495) 000-00-00',
    bookingUrl: 'https://example.com/nkcc',
    verified: true,
    isNkcc: true,
  },
  {
    id: 'adair-clinic-spb',
    name: 'Клиника аллергологии АДАИР',
    address: 'г. Санкт-Петербург, Невский пр., 100',
    city: 'Санкт-Петербург',
    latitude: 59.934,
    longitude: 30.335,
    phone: '+7 (812) 000-00-00',
    verified: true,
  },
];

export const ADAIR_DOCTORS: AdairDoctor[] = [
  {
    id: 'smolkin',
    name: 'Смолкин Юрий Соломонович',
    degree: 'д.м.н., профессор',
    specialization: 'pediatric-allergist',
    clinicId: 'nkcc',
    adairMember: true,
    isChiefExpert: true,
    phone: '+7 (495) 000-00-00',
    bookingUrl: 'https://example.com/smolkin',
  },
  {
    id: 'ivanova',
    name: 'Иванова Елена Петровна',
    degree: 'к.м.н.',
    specialization: 'pediatric-allergist',
    clinicId: 'nkcc',
    adairMember: true,
  },
  {
    id: 'petrov',
    name: 'Петров Алексей Иванович',
    degree: 'д.м.н.',
    specialization: 'adult-allergist',
    clinicId: 'adair-clinic-spb',
    adairMember: true,
  },
];

export function getAdairClinic(id: string): AdairClinic | undefined {
  return ADAIR_CLINICS.find((c) => c.id === id);
}

export function getDoctorsForClinic(clinicId: string): AdairDoctor[] {
  return ADAIR_DOCTORS.filter((d) => d.clinicId === clinicId);
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
