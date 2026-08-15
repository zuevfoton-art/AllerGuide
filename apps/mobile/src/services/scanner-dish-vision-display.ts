/**
 * Display helpers for plate-only dish-vision scan results (no label text).
 */

export function resolveDishVisionPhotoUri(input: {
  fileUri?: string | null;
  base64?: string | null;
  mimeType?: string | null;
}): string | null {
  const fileUri = input.fileUri?.trim();
  if (fileUri) return fileUri;

  const base64 = input.base64?.trim();
  if (!base64) return null;
  const mime = (input.mimeType?.trim() || 'image/jpeg').toLowerCase();
  return `data:${mime};base64,${base64}`;
}

export function formatDishVisionIngredientList(ingredients: string[]): string {
  return ingredients
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ');
}
