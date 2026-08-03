import { findAllergenById } from '@allerguide/core';

/**
 * When OCR/ingredients text hit a keyword that differs from the allergen display
 * name, return that keyword so the UI can show «казеин → Молоко».
 */
export function resolveMatchAliasKeyword(
  allergenId: string | undefined,
  allergenLabel: string,
  scanText: string,
): string | null {
  if (!allergenId || !scanText.trim()) return null;

  const record = findAllergenById(allergenId);
  if (!record) return null;

  const normalizedText = scanText.toLowerCase();
  const labelLower = allergenLabel.toLowerCase();
  const nameLower = record.name.toLowerCase();

  const hit = record.keywords.find((keyword) => {
    const key = keyword.toLowerCase();
    if (!key || key === nameLower || key === labelLower) return false;
    return normalizedText.includes(key);
  });

  return hit ?? null;
}
