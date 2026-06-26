import type { Express, Request, Response } from 'express';
import { eq, ilike, sql } from 'drizzle-orm';
import { getAllAllergens } from '@allerguide/core';
import { db, readDb } from '../db';
import { allergens, products, type ProductRow } from '../db/catalog-schema';
import {
  fetchOpenFoodFactsProduct,
  searchOpenFoodFacts,
  type NormalizedProduct,
} from '../services/open-food-facts';

function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function offFallbackEnabled(): boolean {
  return process.env.PRODUCT_OFF_FALLBACK !== 'false';
}

function normalizeBarcode(raw: string): string {
  return raw.replace(/\s+/g, '').trim();
}

/** Upsert an Open Food Facts product into the catalog cache. */
async function cacheOffProduct(product: NormalizedProduct): Promise<ProductRow> {
  const [saved] = await db
    .insert(products)
    .values({
      barcode: product.barcode,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
      ingredients: product.ingredients,
      allergenTags: product.allergenTags,
      traceTags: product.traceTags,
      source: 'openfoodfacts',
    })
    .onConflictDoUpdate({
      target: products.barcode,
      set: {
        name: sql`excluded.name`,
        brand: sql`excluded.brand`,
        imageUrl: sql`excluded.image_url`,
        ingredients: sql`excluded.ingredients`,
        allergenTags: sql`excluded.allergen_tags`,
        traceTags: sql`excluded.trace_tags`,
        source: sql`excluded.source`,
        updatedAt: new Date(),
      },
    })
    .returning();
  return saved;
}

export function registerCatalogRoutes(app: Express) {
  // Allergen reference catalog. Falls back to the static core taxonomy when no
  // database is configured, so it always works for clients.
  app.get('/api/allergens', async (_req: Request, res: Response) => {
    if (!databaseConfigured()) {
      res.json({ ok: true, source: 'static', allergens: getAllAllergens() });
      return;
    }

    try {
      const rows = await readDb.select().from(allergens);
      if (rows.length === 0) {
        res.json({ ok: true, source: 'static', allergens: getAllAllergens() });
        return;
      }
      res.json({ ok: true, source: 'db', allergens: rows });
    } catch {
      res.json({ ok: true, source: 'static', allergens: getAllAllergens() });
    }
  });

  // Fuzzy product search by name (backed by the pg_trgm GIN index).
  // NOTE: must be registered before `/:barcode` so it is not shadowed.
  app.get('/api/products/search', async (req: Request, res: Response) => {
    if (!databaseConfigured()) {
      res.status(503).json({ ok: false, error: 'Product database is not configured' });
      return;
    }

    const query = String(req.query.q ?? '').trim();
    if (query.length < 2) {
      res.status(400).json({ ok: false, error: 'Query too short' });
      return;
    }

    try {
      const local = await readDb
        .select()
        .from(products)
        .where(ilike(products.name, `%${query}%`))
        .limit(20);

      if (local.length > 0 || !offFallbackEnabled()) {
        res.json({ ok: true, source: 'cache', count: local.length, products: local });
        return;
      }

      // On-demand: nothing cached locally -> query Open Food Facts and cache it.
      const offResults = await searchOpenFoodFacts(query);
      const saved: ProductRow[] = [];
      for (const product of offResults) {
        saved.push(await cacheOffProduct(product));
      }

      res.json({ ok: true, source: 'openfoodfacts', count: saved.length, products: saved });
    } catch {
      res.status(500).json({ ok: false, error: 'Search failed' });
    }
  });

  // Product lookup by barcode.
  app.get('/api/products/:barcode', async (req: Request, res: Response) => {
    if (!databaseConfigured()) {
      res.status(503).json({ ok: false, error: 'Product database is not configured' });
      return;
    }

    const barcode = normalizeBarcode(String(req.params.barcode ?? ''));
    if (!barcode) {
      res.status(400).json({ ok: false, error: 'Missing barcode' });
      return;
    }

    try {
      const [row] = await readDb.select().from(products).where(eq(products.barcode, barcode));
      if (row) {
        res.json({ ok: true, product: row, source: 'cache' });
        return;
      }

      // Write-through cache: on a miss, look up Open Food Facts, persist, return.
      if (offFallbackEnabled()) {
        const fetched = await fetchOpenFoodFactsProduct(barcode);
        if (fetched) {
          const saved = await cacheOffProduct(fetched);
          res.json({ ok: true, product: saved, source: 'openfoodfacts' });
          return;
        }
      }

      res.status(404).json({ ok: false, error: 'Product not found' });
    } catch {
      res.status(500).json({ ok: false, error: 'Lookup failed' });
    }
  });
}
