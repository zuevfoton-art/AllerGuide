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
  // ── МОСКВА ──────────────────────────────────────────────────────────────
  {
    id: 'nkcc-rnimu',
    name: 'НККЦ аллергологии РНИМУ им. Пирогова',
    address: 'Москва, ул. Островитянова, 1',
    city: 'Москва',
    latitude: 55.6443,
    longitude: 37.3497,
    phone: '+7 (495) 434-52-06',
    bookingUrl: 'https://rsmu.ru',
    verified: true,
    isNkcc: true,
  },
  {
    id: 'nczd',
    name: 'НМИЦЗДП им. академика Вельтищева',
    address: 'Москва, Ломоносовский пр-т, 2, стр. 1',
    city: 'Москва',
    latitude: 55.6975,
    longitude: 37.5375,
    phone: '+7 (499) 134-03-92',
    bookingUrl: 'https://nczd.ru',
    verified: true,
  },
  {
    id: 'morozov-dgkb',
    name: 'Морозовская ДГКБ — аллергология',
    address: 'Москва, 4-й Добрынинский пер., 1/9',
    city: 'Москва',
    latitude: 55.7323,
    longitude: 37.6191,
    phone: '+7 (495) 959-88-00',
    bookingUrl: 'https://moroz.mos.ru',
    verified: true,
  },
  {
    id: 'dgkb9-moscow',
    name: 'ДГКБ №9 им. Г.Н. Сперанского',
    address: 'Москва, Шмитовский пр-д, 29',
    city: 'Москва',
    latitude: 55.7618,
    longitude: 37.5371,
    phone: '+7 (499) 256-82-52',
    bookingUrl: 'https://speranskiy.ru',
    verified: true,
  },
  // ── САНКТ-ПЕТЕРБУРГ ──────────────────────────────────────────────────────
  {
    id: 'spbgpmu',
    name: 'СПбГПМУ — аллергология и иммунология',
    address: 'Санкт-Петербург, ул. Литовская, 2',
    city: 'Санкт-Петербург',
    latitude: 59.9736,
    longitude: 30.3257,
    phone: '+7 (812) 542-93-57',
    bookingUrl: 'https://gpmu.org',
    verified: true,
  },
  {
    id: 'almazov-spb',
    name: 'НМИЦ им. В.А. Алмазова — пульмоаллергология',
    address: 'Санкт-Петербург, ул. Аккуратова, 2',
    city: 'Санкт-Петербург',
    latitude: 60.0072,
    longitude: 30.3194,
    phone: '+7 (812) 702-37-01',
    bookingUrl: 'https://almazovcentre.ru',
    verified: true,
  },
  // ── НОВОСИБИРСК ──────────────────────────────────────────────────────────
  {
    id: 'dgkb1-nsk',
    name: 'ДГКБ №1 — аллергология',
    address: 'Новосибирск, ул. Вертковская, 32',
    city: 'Новосибирск',
    latitude: 54.8477,
    longitude: 83.0859,
    phone: '+7 (383) 341-24-66',
    verified: true,
  },
  // ── ЕКАТЕРИНБУРГ ─────────────────────────────────────────────────────────
  {
    id: 'odtb-ekb',
    name: 'ОДКБ №1 — аллергология',
    address: 'Екатеринбург, ул. С. Дерябиной, 32',
    city: 'Екатеринбург',
    latitude: 56.7957,
    longitude: 60.5764,
    phone: '+7 (343) 216-25-04',
    verified: true,
  },
  // ── КРАСНОДАР ────────────────────────────────────────────────────────────
  {
    id: 'dkkb-krasnodar',
    name: 'Краснодарская ДККБ — аллергология',
    address: 'Краснодар, ул. Клиническая, 11',
    city: 'Краснодар',
    latitude: 45.0446,
    longitude: 38.9717,
    phone: '+7 (861) 255-60-91',
    verified: true,
  },
];

export const ADAIR_DOCTORS: AdairDoctor[] = [
  {
    id: 'smolkin',
    name: 'Смолкин Юрий Соломонович',
    degree: 'д.м.н., профессор',
    specialization: 'pediatric-allergist',
    clinicId: 'nkcc-rnimu',
    adairMember: true,
    isChiefExpert: true,
  },
  {
    id: 'luss',
    name: 'Лусс Людмила Васильевна',
    degree: 'д.м.н., профессор',
    specialization: 'adult-allergist',
    clinicId: 'nkcc-rnimu',
    adairMember: true,
  },
  {
    id: 'namazova',
    name: 'Намазова-Баранова Лейла Сеймуровна',
    degree: 'д.м.н., профессор, академик РАН',
    specialization: 'pediatric-allergist',
    clinicId: 'nczd',
    adairMember: true,
  },
  {
    id: 'balabolkin',
    name: 'Балаболкин Иван Иванович',
    degree: 'д.м.н., профессор',
    specialization: 'pediatric-allergist',
    clinicId: 'nczd',
    adairMember: true,
  },
  {
    id: 'revyakina',
    name: 'Ревякина Вера Афанасьевна',
    degree: 'д.м.н., профессор',
    specialization: 'pediatric-allergist',
    clinicId: 'morozov-dgkb',
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

export function getAdairClinicsByCity(): Map<string, AdairClinic[]> {
  const map = new Map<string, AdairClinic[]>();
  for (const clinic of ADAIR_CLINICS) {
    const list = map.get(clinic.city) ?? [];
    list.push(clinic);
    map.set(clinic.city, list);
  }
  return map;
}
