import { describe, expect, it } from 'vitest';
import {
  ADAIR_CLINICS,
  ADAIR_DOCTORS,
  clinicHasMapPin,
  getAdairClinic,
  getDoctorsForClinic,
  isUsableAdairPhone,
  normalizeAdairPhone,
  normalizeAdairVerification,
  normalizeGeocodePrecision,
  parseAdairPhones,
  searchAdairClinics,
} from './adair-catalog';

describe('normalizeAdairVerification', () => {
  it('maps spreadsheet wording onto the four statuses', () => {
    expect(normalizeAdairVerification('Подтверждено: профиль врача и адрес клиники')).toBe(
      'confirmed',
    );
    expect(normalizeAdairVerification('Адрес подтверждён; связь по открытым источникам')).toBe(
      'address-confirmed',
    );
    expect(normalizeAdairVerification('Адрес официальный; связь по открытым источникам')).toBe(
      'address-confirmed',
    );
    expect(normalizeAdairVerification('Клиника отмечена как закрытая; место не найдено')).toBe(
      'unconfirmed',
    );
    expect(normalizeAdairVerification('Клиническая организация не установлена')).toBe(
      'unconfirmed',
    );
    expect(normalizeAdairVerification('Историческая связь; приём не подтверждён')).toBe(
      'unconfirmed',
    );
    expect(
      normalizeAdairVerification('Есть расхождение с картографическим сервисом'),
    ).toBe('needs-review');
  });
});

describe('ADAIR phones', () => {
  it('splits several numbers and normalizes 8xxx to +7', () => {
    expect(parseAdairPhones('+7 (495) 225-45-52; +7 (495) 225-71-04')).toEqual([
      '+7 (495) 225-45-52',
      '+7 (495) 225-71-04',
    ]);
    expect(normalizeAdairPhone('8 (800) 234-10-03')).toBe('+7 (800) 234-10-03');
  });

  it('marks archived numbers unusable', () => {
    expect(isUsableAdairPhone('Архивный номер', 'Архивные телефоны закрытой клиники')).toBe(
      false,
    );
    expect(isUsableAdairPhone('Официальный сайт', 'Регистратура')).toBe(true);
  });
});

describe('ADAIR registry import', () => {
  it('loads 61 persons and 59 organizations from the bundled file', () => {
    expect(ADAIR_DOCTORS).toHaveLength(61);
    expect(ADAIR_CLINICS).toHaveLength(59);
  });

  it('keeps NKCC as one pin with two doctors and two phones', () => {
    const nkcc = getAdairClinic('nkcc');
    expect(nkcc).toMatchObject({
      id: 'nkcc',
      isNkcc: true,
      verification: 'confirmed',
      latitude: 55.644341,
      longitude: 37.490388,
    });
    expect(nkcc?.phones).toEqual(['+7 (495) 225-45-52', '+7 (495) 225-71-04']);
    const doctors = getDoctorsForClinic('nkcc');
    expect(doctors.map((doctor) => doctor.id).sort()).toEqual(['masalskii', 'smolkin']);
    expect(doctors.find((doctor) => doctor.id === 'smolkin')?.isChiefExpert).toBe(true);
  });

  it('does not pin unconfirmed or unlocated organizations', () => {
    const unestablished = getAdairClinic('unestablished');
    expect(unestablished?.latitude).toBeNull();
    expect(clinicHasMapPin(unestablished!)).toBe(false);

    const closed = ADAIR_CLINICS.find((clinic) => clinic.id.includes('sanavita'));
    expect(closed?.verification).toBe('unconfirmed');
    expect(closed?.phoneUsable).toBe(false);
    expect(clinicHasMapPin(closed!)).toBe(false);

    expect(ADAIR_CLINICS.filter(clinicHasMapPin)).toHaveLength(53);
  });

  it('finds a clinic by doctor name', () => {
    const hits = searchAdairClinics('Смолкин');
    expect(hits.map((clinic) => clinic.id)).toContain('nkcc');
  });
});

describe('normalizeGeocodePrecision', () => {
  it('maps geocode status labels', () => {
    expect(normalizeGeocodePrecision('По точному адресу')).toBe('address');
    expect(normalizeGeocodePrecision('По названию организации')).toBe('organization');
    expect(normalizeGeocodePrecision('По нормализованному адресу')).toBe('normalized-address');
    expect(normalizeGeocodePrecision('Нет адреса для геокодирования')).toBe('none');
  });
});
