import type { MedicineAgeResolution, MedicineCard, MedicineSource } from '@allerguide/core';
import { MEDICINE_DB_ENABLED } from '@/src/constants/features';
import { getApiBaseUrl } from '@/src/services/api-client';
import { getBackendAuthToken } from '@/src/services/auth-service';
import { logCaughtError } from '@/src/services/error-reporting';

export interface MedicineRecognizeApiSuccess {
  ok: true;
  medicine: MedicineCard;
  ageUsage: MedicineAgeResolution;
  source: MedicineSource;
  cached?: boolean;
}

export interface MedicineRecognizeApiFailure {
  ok: false;
  error: string;
  status?: number;
  providerStatus?: number;
}

function stripDataUrlPrefix(base64: string): string {
  const trimmed = base64.trim();
  const comma = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && comma >= 0) {
    return trimmed.slice(comma + 1);
  }
  return trimmed;
}

/**
 * Catalog-first medicine recognition. Returns null when the feature flag is off.
 */
export async function recognizeMedicineViaApi(input: {
  imageBase64?: string;
  mimeType?: string;
  ocrText?: string;
  name?: string;
  ageYears?: number | null;
}): Promise<MedicineRecognizeApiSuccess | MedicineRecognizeApiFailure | null> {
  if (!MEDICINE_DB_ENABLED) return null;

  const token = await getBackendAuthToken();
  const response = await fetch(`${getApiBaseUrl()}/api/medicines/recognize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      ...(input.imageBase64
        ? { imageBase64: stripDataUrlPrefix(input.imageBase64), mimeType: input.mimeType || 'image/jpeg' }
        : {}),
      ...(input.ocrText?.trim() ? { ocrText: input.ocrText.trim() } : {}),
      ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      ...(input.ageYears != null ? { ageYears: input.ageYears } : {}),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    medicine?: MedicineCard;
    ageUsage?: MedicineAgeResolution;
    source?: MedicineSource;
    cached?: boolean;
    error?: string;
    providerStatus?: number;
  };

  if (!response.ok || !payload.ok || !payload.medicine) {
    return {
      ok: false,
      error: payload.error || `Medicine recognize HTTP ${response.status}`,
      status: response.status,
      ...(typeof payload.providerStatus === 'number'
        ? { providerStatus: payload.providerStatus }
        : {}),
    };
  }

  return {
    ok: true,
    medicine: payload.medicine,
    ageUsage: payload.ageUsage ?? { blocked: false },
    source: payload.source ?? 'catalog',
    cached: payload.cached,
  };
}

const CATALOG_SEARCH_TIMEOUT_MS = 2500;

export async function searchMedicinesFromCatalog(query: string): Promise<MedicineCard[]> {
  const term = query.trim();
  const baseUrl = getApiBaseUrl();
  if (term.length < 2 || !baseUrl) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CATALOG_SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${baseUrl}/api/medicines/search?q=${encodeURIComponent(term)}`,
      { signal: controller.signal },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { ok?: boolean; medicines?: MedicineCard[] };
    if (!data.ok || !Array.isArray(data.medicines)) return [];
    return data.medicines;
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) {
      logCaughtError('searchMedicinesFromCatalog', error, { extra: { query: term } });
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Write-through a found/typed card into the YC catalog. Catalog writes require a
 * signed-in device, so without a backend token we keep the card local instead of
 * collecting 401s on every save.
 */
export async function rememberMedicineViaApi(card: MedicineCard): Promise<MedicineCard | null> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl || !card.name.trim()) return null;

  const token = await getBackendAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${baseUrl}/api/medicines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(card),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { ok?: boolean; medicine?: MedicineCard };
    return data.ok && data.medicine ? data.medicine : null;
  } catch (error) {
    logCaughtError('rememberMedicineViaApi', error, { extra: { name: card.name } });
    return null;
  }
}
