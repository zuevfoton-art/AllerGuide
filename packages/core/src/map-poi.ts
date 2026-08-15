import { ADAIR_CLINICS, type AdairClinic } from './adair-catalog';
import type { CatalogPlace } from './catalog';
import { haversineDistanceKm } from './geo';

export type MapPoiCategory = 'restaurant' | 'cafe' | 'medical' | 'pharmacy';

export const MAP_POI_CATEGORIES: readonly MapPoiCategory[] = [
  'restaurant',
  'cafe',
  'medical',
  'pharmacy',
];
export type MapPoiSource = 'catalog' | 'adair' | 'google-places';
export type AllergySafety = 'unknown' | 'curated' | 'verified';

export interface MapPoi {
  id: string;
  title: string;
  note: string;
  category: MapPoiCategory;
  lat: number;
  lng: number;
  /**
   * Visual pin weight for curated/ADAIR rows only. Google Places must not map
   * rating onto this field as if it were allergy safety.
   */
  level: 'high' | 'medium' | 'low';
  icon: string;
  tags: string[];
  phone?: string;
  bookingUrl?: string;
  source: MapPoiSource;
  /** Google star rating when present — never treat as allergen safety. */
  rating?: number;
  allergySafety: AllergySafety;
  googlePlaceId?: string;
}

export interface PlaceAutocompleteSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText?: string;
  distanceMeters?: number;
}

export interface MapPoiDetails extends MapPoi {
  googleMapsUri?: string;
  websiteUri?: string;
  openingHours?: string;
}

/** Curated Moscow-area catalog is only honest near this origin. */
export const CATALOG_PLACES_ORIGIN = { latitude: 55.7558, longitude: 37.6173 };
export const CATALOG_PLACES_REGION_KM = 80;

const PHARMACY_TAG = 'pharmacy';
const MEDICAL_TAGS = new Set(['pharmacy', 'clinic', 'hospital', 'medical']);
const CAFE_TAGS = new Set(['cafe', 'coffee', 'bakery', 'coffee_shop']);

const MAP_POI_CATEGORY_ICONS: Record<MapPoiCategory, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  medical: 'medical',
  pharmacy: 'medkit',
};

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
    allergySafety: 'curated',
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
    allergySafety: clinic.verified ? 'verified' : 'curated',
  };
}

export function adairClinicsAsMapPois(clinics: AdairClinic[] = ADAIR_CLINICS): MapPoi[] {
  return clinics.map(adairClinicToMapPoi);
}

export function isOriginInCatalogRegion(
  latitude: number,
  longitude: number,
  radiusKm = CATALOG_PLACES_REGION_KM,
): boolean {
  return (
    haversineDistanceKm(
      { latitude, longitude },
      CATALOG_PLACES_ORIGIN,
    ) <= radiusKm
  );
}

/**
 * Normalize a Google Places result into MapPoi.
 * Rating is stored separately; allergy safety stays unknown until curated data exists.
 */
export function googlePlaceToMapPoi(input: {
  placeId: string;
  name: string;
  vicinity?: string;
  lat: number;
  lng: number;
  types?: string[];
  rating?: number;
  phone?: string;
  websiteUri?: string;
  googleMapsUri?: string;
}): MapPoi | null {
  const placeId = input.placeId.trim();
  const name = input.name.trim();
  if (!placeId || !name) return null;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;

  const types = (input.types ?? []).map((type) => type.toLowerCase());
  const category = resolveGooglePlaceCategory(types);

  return {
    id: `google:${placeId}`,
    title: name,
    note: input.vicinity?.trim() || name,
    category,
    lat: input.lat,
    lng: input.lng,
    level: 'medium',
    icon: MAP_POI_CATEGORY_ICONS[category],
    tags: types.slice(0, 4),
    phone: input.phone?.trim() || undefined,
    bookingUrl: input.websiteUri?.trim() || undefined,
    source: 'google-places',
    rating: typeof input.rating === 'number' && Number.isFinite(input.rating) ? input.rating : undefined,
    allergySafety: 'unknown',
    googlePlaceId: placeId,
  };
}

export function googlePlaceDetailsToMapPoi(input: {
  placeId: string;
  name: string;
  vicinity?: string;
  lat: number;
  lng: number;
  types?: string[];
  rating?: number;
  phone?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  openingHours?: string;
}): MapPoiDetails | null {
  const poi = googlePlaceToMapPoi(input);
  if (!poi) return null;
  return {
    ...poi,
    googleMapsUri: input.googleMapsUri?.trim() || undefined,
    websiteUri: input.websiteUri?.trim() || undefined,
    openingHours: input.openingHours?.trim() || undefined,
  };
}

export function normalizePlaceAutocompleteSuggestion(input: {
  placeId?: string;
  primaryText?: string;
  secondaryText?: string;
  distanceMeters?: number;
}): PlaceAutocompleteSuggestion | null {
  const placeId = input.placeId?.trim() ?? '';
  const primaryText = input.primaryText?.trim() ?? '';
  if (!placeId || !primaryText) return null;
  return {
    placeId,
    primaryText,
    secondaryText: input.secondaryText?.trim() || undefined,
    distanceMeters:
      typeof input.distanceMeters === 'number' && Number.isFinite(input.distanceMeters)
        ? input.distanceMeters
        : undefined,
  };
}

export function dedupeMapPoisByPlaceId(pois: MapPoi[]): MapPoi[] {
  const seen = new Set<string>();
  const result: MapPoi[] = [];
  for (const poi of pois) {
    const key = poi.googlePlaceId ?? poi.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(poi);
  }
  return result;
}

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
