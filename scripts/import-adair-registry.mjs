#!/usr/bin/env node
/**
 * Convert the ADAIR clinics/doctors xlsx into bundled JSON.
 * Usage: node scripts/import-adair-registry.mjs <xlsx> [out.json]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const RU_LAT_MIN = 41;
const RU_LAT_MAX = 82;
const RU_LON_MIN = 19;
const RU_LON_MAX = 191;

const CYR_TO_LAT = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function foldYo(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
}

function slugify(value) {
  const folded = foldYo(value)
    .split('')
    .map((ch) => CYR_TO_LAT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return folded || 'item';
}

function clinicIdFor(name, city) {
  if (/нккц/i.test(name)) return 'nkcc';
  if (/не установлена/i.test(name) || name === '—' || !name.trim()) return 'unestablished';
  const citySlug = city && city !== '—' ? slugify(city) : '';
  const base = slugify(name);
  return citySlug ? `${base}-${citySlug}` : base;
}

function doctorIdFor(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 0) return 'doctor';
  return slugify(parts[0]);
}

export function normalizeAdairVerification(raw) {
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

export function normalizeGeocodePrecision(raw) {
  const text = foldYo(raw);
  if (text.includes('точному адресу')) return 'address';
  if (text.includes('названию организации')) return 'organization';
  if (text.includes('нормализован')) return 'normalized-address';
  return 'none';
}

export function parseAdairPhones(raw) {
  return String(raw ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(normalizeAdairPhone)
    .filter(Boolean);
}

export function normalizeAdairPhone(raw) {
  const trimmed = String(raw ?? '').trim();
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

export function isUsableAdairPhone(status, purpose) {
  const text = `${foldYo(status)} ${foldYo(purpose)}`;
  return !text.includes('архивн');
}

function cityAppearsInAddress(city, address) {
  const cityNorm = foldYo(city).replace(/^г\.\s*/, '');
  if (!cityNorm || cityNorm === '—') return true;
  return foldYo(address).includes(cityNorm);
}

function cellText(value) {
  if (value == null) return '';
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return String(value).trim();
}

function cellNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function readRegistryRows(xlsxPath) {
  const { spawnSync } = await import('node:child_process');
  const py = `
import json, datetime, openpyxl
wb = openpyxl.load_workbook(${JSON.stringify(xlsxPath)}, data_only=True)
ws = wb["Реестр"]
rows = []
for i, row in enumerate(ws.iter_rows(values_only=True), 1):
    if i < 5:
        continue
    vals = []
    for c in row[:22]:
        if isinstance(c, datetime.datetime):
            vals.append(c.date().isoformat())
        elif c is None:
            vals.append("")
        else:
            vals.append(c)
    if not any(vals):
        continue
    rows.append(vals)
print(json.dumps(rows, ensure_ascii=False))
`;
  const result = spawnSync('python3', ['-c', py], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'failed to read xlsx');
  }
  return JSON.parse(result.stdout);
}

function buildRegistry(rows) {
  const errors = [];
  const clinicsById = new Map();
  const doctors = [];

  for (const row of rows) {
    const [
      _num,
      section,
      name,
      role,
      orgName,
      orgType,
      city,
      address,
      verificationRaw,
      sourceDoctor,
      sourceAddress,
      checkedAt,
      latRaw,
      lonRaw,
      geocodeStatus,
      sourceCoordinates,
      geocodedAt,
      phonesRaw,
      phonePurpose,
      phoneStatus,
      sourcePhone,
      phoneCheckedAt,
    ] = row;

    if (!name) continue;

    const clinicId = clinicIdFor(String(orgName ?? ''), String(city ?? ''));
    const verification = normalizeAdairVerification(verificationRaw);
    const latitude = cellNumber(latRaw);
    const longitude = cellNumber(lonRaw);
    const phones = parseAdairPhones(phonesRaw);
    const phoneUsable = isUsableAdairPhone(phoneStatus, phonePurpose);
    const geocodePrecision = normalizeGeocodePrecision(geocodeStatus);

    if (latitude != null || longitude != null) {
      if (latitude == null || longitude == null) {
        errors.push(`${name}: incomplete coordinates`);
      } else if (latitude === 0 && longitude === 0) {
        errors.push(`${name}: 0/0 coordinates`);
      } else if (
        latitude < RU_LAT_MIN ||
        latitude > RU_LAT_MAX ||
        longitude < RU_LON_MIN ||
        longitude > RU_LON_MAX
      ) {
        errors.push(`${name}: coordinates outside RF bounds (${latitude}, ${longitude})`);
      }
    }

    if (!cityAppearsInAddress(city, address)) {
      errors.push(`${name}: city "${city}" not found in address "${address}"`);
    }

    const clinic = {
      id: clinicId,
      name: cellText(orgName) || 'Клиническая организация не установлена',
      address: cellText(address),
      city: cellText(city) === '—' ? '' : cellText(city),
      orgType: cellText(orgType) === '—' ? '' : cellText(orgType),
      latitude,
      longitude,
      phones,
      phonePurpose: cellText(phonePurpose) || undefined,
      phoneUsable,
      verification,
      geocodePrecision,
      isNkcc: clinicId === 'nkcc',
      sources: {
        doctor: cellText(sourceDoctor) || undefined,
        address: cellText(sourceAddress) || undefined,
        coordinates: cellText(sourceCoordinates) || undefined,
        phone: cellText(sourcePhone) || undefined,
      },
      checkedAt: cellText(checkedAt) || undefined,
      geocodedAt: cellText(geocodedAt) || undefined,
      phoneCheckedAt: cellText(phoneCheckedAt) || undefined,
    };

    const existing = clinicsById.get(clinicId);
    if (existing) {
      if (existing.latitude !== clinic.latitude || existing.longitude !== clinic.longitude) {
        errors.push(`${clinic.name}: conflicting coordinates for one organization`);
      }
      if (clinic.verification === 'confirmed') existing.verification = 'confirmed';
      else if (
        clinic.verification === 'address-confirmed' &&
        existing.verification !== 'confirmed'
      ) {
        existing.verification = 'address-confirmed';
      }
    } else {
      clinicsById.set(clinicId, clinic);
    }

    doctors.push({
      id: doctorIdFor(name),
      name: cellText(name),
      degree: '',
      role: cellText(role),
      section: cellText(section),
      clinicId,
      adairMember: true,
      isChiefExpert: foldYo(role) === 'президент',
      phone: phones[0],
      verification,
    });
  }

  const doctorIds = new Set();
  for (const doctor of doctors) {
    let id = doctor.id;
    let n = 2;
    while (doctorIds.has(id)) {
      id = `${doctor.id}-${n}`;
      n += 1;
    }
    doctor.id = id;
    doctorIds.add(id);
  }

  if (errors.length > 0) {
    throw new Error(`ADAIR import validation failed:\n- ${errors.join('\n- ')}`);
  }

  return {
    meta: {
      sourceFile: 'ADAIR_clinics_doctors_addresses_2026-08-25.xlsx',
      sourceUrl: 'https://adair.ru/struktura-adair/',
      coordinateSource: 'Nominatim / OpenStreetMap',
      checkedAt: '2026-08-25',
      geocodedAt: '2026-08-26',
      phoneCheckedAt: '2026-08-26',
      disclaimer:
        'Исследовательский справочник по публичным данным, а не расписание приёма. Перед визитом подтвердите филиал и часы работы.',
    },
    clinics: [...clinicsById.values()],
    doctors,
  };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());

if (isMain || process.argv[1]?.includes('import-adair-registry')) {
  const xlsxPath = resolve(
    process.argv[2] ??
      '/home/ubuntu/.cursor/projects/workspace/uploads/ADAIR_clinics_doctors_addresses_2026-08-25_09d4.xlsx',
  );
  const outPath = resolve(process.argv[3] ?? 'packages/core/src/data/adair-registry.json');
  const rows = await readRegistryRows(xlsxPath);
  const registry = buildRegistry(rows);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(registry, null, 2)}\n`);
  const pinCount = registry.clinics.filter(
    (clinic) =>
      clinic.latitude != null &&
      clinic.longitude != null &&
      clinic.verification !== 'unconfirmed',
  ).length;
  console.log(
    `Wrote ${registry.doctors.length} doctors / ${registry.clinics.length} clinics (${pinCount} map pins) → ${outPath}`,
  );
}
