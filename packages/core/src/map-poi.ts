import { ADAIR_CLINICS, type AdairClinic } from './adair-catalog';
import type { CatalogPlace } from './catalog';

export type MapPoiCategory = 'restaurant' | 'cafe' | 'medical' | 'pharmacy';

export const MAP_POI_CATEGORIES: readonly MapPoiCategory[] = [
  'restaurant',
  'cafe',
  'medical',
  'pharmacy',
];
export type MapPoiSource = 'catalog' | 'adair' | 'google-places';

export interface MapPoi {
  id: string;
  title: string;
  note: string;
  category: MapPoiCategory;
  lat: number;
  lng: number;
  level: 'high' | 'medium' | 'low';
  icon: string;
  tags: string[];
  phone?: string;
  bookingUrl?: string;
  source: MapPoiSource;
}

const PHARMACY_TAG = 'pharmacy';
const MEDICAL_TAGS = new Set(['pharmacy', 'clinic', 'hospital', 'medical']);
const CAFE_TAGS = new Set(['cafe', 'coffee', 'bakery', 'coffee_shop']);

/** Infer POI category from catalog place tags/icon. */
export function catalogPlaceCategory(place: CatalogPlace): MapPoiCategory {
  const tags = place.tags.map((tag) => tag.toLowerCase());
  if (tags.includes(PHARMACY_TAG) || place.icon === 'medkit') return 'pharmacy';
  if (tags.some((tag) => MEDICAL_TAGS.has(tag))) return 'medical';
  if (place.icon === 'cafe' || tags.some((tag) => CAFE_TAGS.has(tag))) return 'cafe';
  return 'restaurant';
}

export function catalogPlaceToMapPoi(place: CatalogPlace): MapPoi {
  return {
    id: place.id,
    title: place.title,
    note: place.note,
    category: catalogPlaceCategory(place),
    lat: place.lat,
    lng: place.lng,
    level: place.level,
    icon: place.icon,
    tags: place.tags,
    source: 'catalog',
  };
}

export function adairClinicToMapPoi(clinic: AdairClinic): MapPoi {
  return {
    id: `adair:${clinic.id}`,
    title: clinic.name,
    note: clinic.address,
    category: 'medical',
    lat: clinic.latitude,
    lng: clinic.longitude,
    level: clinic.verified ? 'high' : 'medium',
    icon: 'medical',
    tags: [clinic.city, ...(clinic.isNkcc ? ['NKCC'] : [])],
    phone: clinic.phone,
    bookingUrl: clinic.bookingUrl,
    source: 'adair',
  };
}

export function adairClinicsAsMapPois(clinics: AdairClinic[] = ADAIR_CLINICS): MapPoi[] {
  return clinics.map(adairClinicToMapPoi);
}

/**
 * Normalize a Google Places Nearby result into MapPoi.
 * Unknown types default to restaurant so food venues still appear.
 */
export function googlePlaceToMapPoi(input: {
  placeId: string;
  name: string;
  vicinity?: string;
  lat: number;
  lng: number;
  types?: string[];
  rating?: number;
}): MapPoi | null {
  const placeId = input.placeId.trim();
  const name = input.name.trim();
  if (!placeId || !name) return null;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;

  const types = (input.types ?? []).map((type) => type.toLowerCase());
  const category = resolveGooglePlaceCategory(types);
  const level =
    typeof input.rating === 'number' && input.rating >= 4.2
      ? 'high'
      : typeof input.rating === 'number' && input.rating >= 3.5
        ? 'medium'
        : 'low';

  return {
    id: `google:${placeId}`,
    title: name,
    note: input.vicinity?.trim() || name,
    category,
    lat: input.lat,
    lng: input.lng,
    level,
    icon: MAP_POI_CATEGORY_ICONS[category],
    tags: types.slice(0, 4),
    source: 'google-places',
  };
}

const MAP_POI_CATEGORY_ICONS: Record<MapPoiCategory, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  medical: 'medical',
  pharmacy: 'medkit',
};

export function filterMapPoisByCategory(
  pois: MapPoi[],
  categories: readonly MapPoiCategory[],
): MapPoi[] {
  if (categories.length === 0) return [];
  const allowed = new Set(categories);
  return pois.filter((poi) => allowed.has(poi.category));
}

function resolveGooglePlaceCategory(types: string[]): MapPoiCategory {
  if (types.includes('pharmacy') || types.includes('drugstore')) return 'pharmacy';
  if (
    types.includes('hospital') ||
    types.includes('doctor') ||
    types.includes('health') ||
    types.includes('clinic') ||
    types.includes('dental_clinic')
  ) {
    return 'medical';
  }
  if (
    types.includes('cafe') ||
    types.includes('coffee_shop') ||
    types.includes('bakery')
  ) {
    return 'cafe';
  }
  return 'restaurant';
}
