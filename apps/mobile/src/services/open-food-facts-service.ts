export interface OpenFoodFactsProduct {
  name: string;
  ingredients: string;
  barcode: string;
}

export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const normalized = barcode.replace(/\D/g, '');
  if (!normalized) return null;

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${normalized}.json?fields=product_name,ingredients_text,ingredients_text_ru,code`,
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        ingredients_text?: string;
        ingredients_text_ru?: string;
        code?: string;
      };
    };

    if (data.status !== 1 || !data.product) return null;

    const ingredients =
      data.product.ingredients_text_ru?.trim() ||
      data.product.ingredients_text?.trim() ||
      '';

    if (!ingredients && !data.product.product_name) return null;

    return {
      name: data.product.product_name?.trim() || `Продукт ${normalized}`,
      ingredients: ingredients || data.product.product_name || '',
      barcode: data.product.code || normalized,
    };
  } catch {
    return null;
  }
}
