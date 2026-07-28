/** Country dial codes for the shared phone input (default +7). */
export interface PhoneCountry {
  iso2: string;
  dialCode: string;
  name: string;
  /** National number length hints for mask grouping (min–max digits after dial). */
  nationalMin: number;
  nationalMax: number;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso2: 'RU', dialCode: '7', name: 'Россия', nationalMin: 10, nationalMax: 10 },
  { iso2: 'KZ', dialCode: '7', name: 'Казахстан', nationalMin: 10, nationalMax: 10 },
  { iso2: 'BY', dialCode: '375', name: 'Беларусь', nationalMin: 9, nationalMax: 9 },
  { iso2: 'UA', dialCode: '380', name: 'Украина', nationalMin: 9, nationalMax: 9 },
  { iso2: 'UZ', dialCode: '998', name: 'Узбекистан', nationalMin: 9, nationalMax: 9 },
  { iso2: 'AM', dialCode: '374', name: 'Армения', nationalMin: 8, nationalMax: 8 },
  { iso2: 'GE', dialCode: '995', name: 'Грузия', nationalMin: 9, nationalMax: 9 },
  { iso2: 'DE', dialCode: '49', name: 'Deutschland', nationalMin: 10, nationalMax: 11 },
  { iso2: 'FR', dialCode: '33', name: 'France', nationalMin: 9, nationalMax: 9 },
  { iso2: 'IT', dialCode: '39', name: 'Italia', nationalMin: 9, nationalMax: 10 },
  { iso2: 'ES', dialCode: '34', name: 'España', nationalMin: 9, nationalMax: 9 },
  { iso2: 'GB', dialCode: '44', name: 'United Kingdom', nationalMin: 10, nationalMax: 10 },
  { iso2: 'US', dialCode: '1', name: 'United States', nationalMin: 10, nationalMax: 10 },
  { iso2: 'TR', dialCode: '90', name: 'Türkiye', nationalMin: 10, nationalMax: 10 },
];

export const DEFAULT_PHONE_COUNTRY_ISO2 = 'RU';

export function getPhoneCountry(iso2: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.iso2 === iso2) ?? PHONE_COUNTRIES[0]!;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Format national digits for display: operator in parentheses, then groups.
 * RU/KZ example: 9991234567 → (999) 123-45-67
 */
export function formatNationalNumber(nationalDigits: string, iso2: string = DEFAULT_PHONE_COUNTRY_ISO2): string {
  const digits = digitsOnly(nationalDigits);
  if (!digits) return '';

  if (iso2 === 'RU' || iso2 === 'KZ' || iso2 === 'US') {
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 6);
    const c = digits.slice(6, 8);
    const d = digits.slice(8, 10);
    if (digits.length <= 3) return `(${a}`;
    if (digits.length <= 6) return `(${a}) ${b}`;
    if (digits.length <= 8) return `(${a}) ${b}-${c}`;
    return `(${a}) ${b}-${c}-${d}`;
  }

  // Generic: (xxx) xxx-xxxx style when enough digits, else spaced groups of 3.
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatPhoneDisplay(dialCode: string, nationalDigits: string, iso2?: string): string {
  const national = formatNationalNumber(nationalDigits, iso2);
  if (!national) return `+${dialCode}`;
  return `+${dialCode} ${national}`;
}

/** Store as E.164-ish: +{dial}{nationalDigits} */
export function toE164(dialCode: string, nationalDigits: string): string {
  const national = digitsOnly(nationalDigits);
  const dial = digitsOnly(dialCode);
  if (!national) return dial ? `+${dial}` : '';
  return `+${dial}${national}`;
}

export interface ParsedPhone {
  countryIso2: string;
  dialCode: string;
  nationalDigits: string;
  e164: string;
  display: string;
}

/**
 * Parse a free-form or E.164 phone into country + national parts.
 * Prefers +7 → RU when ambiguous.
 */
export function parsePhone(raw: string, preferredIso2: string = DEFAULT_PHONE_COUNTRY_ISO2): ParsedPhone {
  const preferred = getPhoneCountry(preferredIso2);
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      countryIso2: preferred.iso2,
      dialCode: preferred.dialCode,
      nationalDigits: '',
      e164: '',
      display: formatPhoneDisplay(preferred.dialCode, '', preferred.iso2),
    };
  }

  let digits = digitsOnly(trimmed);
  // Leading 8 for RU national → treat as dial 7
  if (!trimmed.startsWith('+') && digits.startsWith('8') && digits.length === 11) {
    digits = `7${digits.slice(1)}`;
  }

  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const country of sorted) {
    if (!digits.startsWith(country.dialCode)) continue;
    // Prefer preferred country when dial codes collide (7 → RU vs KZ)
    if (country.dialCode === preferred.dialCode && country.iso2 !== preferred.iso2) {
      const preferredMatch = preferred;
      if (digits.startsWith(preferredMatch.dialCode)) {
        const nationalDigits = digits.slice(preferredMatch.dialCode.length).slice(0, preferredMatch.nationalMax);
        return {
          countryIso2: preferredMatch.iso2,
          dialCode: preferredMatch.dialCode,
          nationalDigits,
          e164: toE164(preferredMatch.dialCode, nationalDigits),
          display: formatPhoneDisplay(preferredMatch.dialCode, nationalDigits, preferredMatch.iso2),
        };
      }
    }
    const nationalDigits = digits.slice(country.dialCode.length).slice(0, country.nationalMax);
    return {
      countryIso2: country.iso2,
      dialCode: country.dialCode,
      nationalDigits,
      e164: toE164(country.dialCode, nationalDigits),
      display: formatPhoneDisplay(country.dialCode, nationalDigits, country.iso2),
    };
  }

  const nationalDigits = digits.slice(0, preferred.nationalMax);
  return {
    countryIso2: preferred.iso2,
    dialCode: preferred.dialCode,
    nationalDigits,
    e164: toE164(preferred.dialCode, nationalDigits),
    display: formatPhoneDisplay(preferred.dialCode, nationalDigits, preferred.iso2),
  };
}

export function normalizePhone(raw: string): string {
  const parsed = parsePhone(raw);
  return parsed.e164;
}

export function validatePhone(raw: string): string | null {
  const parsed = parsePhone(raw);
  if (!parsed.nationalDigits) return 'Введите номер телефона.';
  const country = getPhoneCountry(parsed.countryIso2);
  const len = parsed.nationalDigits.length;
  if (len < country.nationalMin || len > country.nationalMax) {
    return 'Введите корректный номер телефона.';
  }
  const totalDigits = digitsOnly(parsed.e164).length;
  if (totalDigits < 10 || totalDigits > 15) {
    return 'Введите корректный номер телефона.';
  }
  return null;
}
