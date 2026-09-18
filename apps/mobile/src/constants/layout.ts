export const MOBILE_WEB_MAX_WIDTH = 480;
export const TABLET_WEB_MAX_WIDTH = 720;
export const COMPACT_BREAKPOINT = 360;
export const TABLET_BREAKPOINT = 768;
/** Zip `layout.tabBarHeight` — tab row 52 + home indicator 34. */
export const WEB_TAB_BAR_HEIGHT = 86;
export const WEB_INPUT_FONT_SIZE = 16;

/**
 * Radii from Figma Make zip `code-3.txt`:
 * sm 6 / md 8 / lg 12 / xl 16 / xxl 24 / full 999.
 * Existing keys map onto that scale (CTA uses `lg`, cards use `xl`/`card`).
 */
export const radii = {
  xs: 6,
  sm: 6,
  md: 8,
  row: 12,
  card: 16,
  lg: 12,
  xl: 16,
  xxl: 24,
  field: 12,
  full: 999,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
} as const;

/**
 * Compact vertical rhythm. Do not shrink tap heights — NFR-05 / WCAG 2.2 is 44pt
 * (36 for small buttons). Zip CTA is 48 / radius.lg.
 */
export const density = {
  screenGap: 16,
  cardPadding: 16,
  kpiRowPaddingV: 8,
  listRowPaddingV: 12,
  pickerRowPaddingV: 8,
  pickerRowGap: 6,
  tapMinHeight: 44,
  tapMinHeightSm: 36,
  /** Zip primary filled action */
  tapMinHeightPrimary: 48,
  /** Zip secondary / skip */
  tapMinHeightSecondary: 48,
  /** Crisis CTA: reachable with shaking hands, north-star §3.3 / v2 §3.1. */
  tapMinHeightCrisis: 60,
  /** Extended Ask FAB / icon FAB / zip diary FAB */
  tapMinHeightFab: 56,
} as const;

/** Brand hex for static HTML/PDF exports (mirrors light zip theme) */
export const brandReportColors = {
  text: '#2C3531',
  head: '#2C3531',
  muted: '#6B7C75',
  bg: '#FDFBF9',
  border: '#E2E8F0',
  accent: '#5B8C7A',
  danger: '#E53E3E',
} as const;
