import { create } from 'zustand';
import {
  buildCheckoutSummary,
  getCatalogProductPriceMinor,
  type CheckoutLineItem,
  type CheckoutSummary,
  type DiscountValidationResult,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

const CART_KEY = 'marketplaceCart:v1';

function readCart(): CheckoutLineItem[] {
  try {
    const raw = getSetting(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CheckoutLineItem[];
    return Array.isArray(parsed) ? parsed.filter((item) => item.productId) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CheckoutLineItem[]) {
  setSetting(CART_KEY, JSON.stringify(items));
}

interface CartState {
  items: CheckoutLineItem[];
  appliedDiscount: Extract<DiscountValidationResult, { ok: true }> | null;
  hydrate: () => void;
  addProduct: (productId: string) => void;
  removeProduct: (productId: string) => void;
  clear: () => void;
  setDiscountResult: (result: DiscountValidationResult) => void;
  clearDiscount: () => void;
  getSummary: () => CheckoutSummary;
  totalQuantity: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: readCart(),
  appliedDiscount: null,

  hydrate: () => set({ items: readCart() }),

  addProduct: (productId) => {
    const price = getCatalogProductPriceMinor(productId);
    if (price === null) return;
    const items = [...get().items];
    const existing = items.find((item) => item.productId === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ productId, quantity: 1, unitPriceMinor: price });
    }
    writeCart(items);
    set({ items, appliedDiscount: null });
  },

  removeProduct: (productId) => {
    const items = get().items.filter((item) => item.productId !== productId);
    writeCart(items);
    set({ items, appliedDiscount: null });
  },

  clear: () => {
    writeCart([]);
    set({ items: [], appliedDiscount: null });
  },

  setDiscountResult: (result) => {
    if (result.ok) set({ appliedDiscount: result });
    else set({ appliedDiscount: null });
  },

  clearDiscount: () => set({ appliedDiscount: null }),

  getSummary: () => buildCheckoutSummary(get().items, get().appliedDiscount ?? undefined),

  totalQuantity: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
