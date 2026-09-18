export const MOBILE_WEB_MAX_WIDTH = 480;
export const TABLET_WEB_MAX_WIDTH = 720;
export const COMPACT_BREAKPOINT = 360;
export const TABLET_BREAKPOINT = 768;
export const WEB_TAB_BAR_HEIGHT = 68;
export const WEB_INPUT_FONT_SIZE = 16;

/**
 * Brandbook radii — soft institutional blocks; pills only on ACTION.
 * `full` is for ACTION pressables only (Button, extended FAB, emergency call).
 * Chips, inputs and badges stay on `sm` / `md` — they hold state, they do not fire an action.
 */
/** Radii from Figma screens-flow-map (cards 16–20, inputs 12, soft 24–32, ACTION full). */
export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  row: 16,
  /** Soft cards / map chips — Figma ~20 */
  card: 20,
  lg: 24,
  xl: 32,
  field: 36,
  full: 9999,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
} as const;

/**
 * Compact vertical rhythm. Do not shrink tap heights — NFR-05 / WCAG 2.2 is 44pt
 * (36 for small buttons). Tighten gaps and inner padding instead.
 */
export const density = {
  screenGap: 10,
  cardPadding: 14,
  kpiRowPaddingV: 8,
  listRowPaddingV: 12,
  pickerRowPaddingV: 8,
  pickerRowGap: 6,
  tapMinHeight: 44,
  tapMinHeightSm: 36,
  /** v2 §3.1 primary filled action */
  tapMinHeightPrimary: 52,
  /** v2 §3.1 secondary */
  tapMinHeightSecondary: 48,
  /** Crisis CTA: reachable with shaking hands, north-star §3.3 / v2 §3.1. */
  tapMinHeightCrisis: 60,
  /** Extended Ask FAB / icon FAB */
  tapMinHeightFab: 56,
} as const;

/** Brand hex for static HTML/PDF exports (mirrors light Claro theme) */
export const brandReportColors = {
  text: '#2C3531',
  head: '#2C3531',
  muted: '#5F716B',
  bg: '#FDFBF9',
  border: '#E2E8F0',
  accent: '#5B8C7A',
  danger: '#E53E3E',
} as const;
