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
export const radii = {
  xs: 6,
  sm: 10,
  md: 16,
  row: 16,
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
  text: '#0F172A',
  head: '#1E3A5F',
  muted: '#64748B',
  bg: '#F3F6F4',
  border: '#E3E9E5',
  accent: '#2A9D8F',
  danger: '#B91C1C',
} as const;
