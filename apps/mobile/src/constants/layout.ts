export const MOBILE_WEB_MAX_WIDTH = 480;
export const TABLET_WEB_MAX_WIDTH = 720;
export const COMPACT_BREAKPOINT = 360;
export const TABLET_BREAKPOINT = 768;
export const WEB_TAB_BAR_HEIGHT = 68;
export const WEB_INPUT_FONT_SIZE = 16;

/**
 * Clinical Calm radii — round 3 geometry (handoff pairs 19–22).
 * `full` is for ACTION pressables only (Button, period segment, emergency call).
 * Chips, inputs and badges stay on `sm` / `md` — they hold state, they do not fire an action.
 */
export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  row: 14,
  lg: 20,
  xl: 28,
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
  /** Crisis CTA: reachable with shaking hands, north-star §3.3. */
  tapMinHeightCrisis: 56,
} as const;

/** Brand hex for static HTML/PDF exports (mirrors light Earth Wellness theme) */
export const brandReportColors = {
  text: '#1C2624',
  head: '#1C1B18',
  muted: '#5A5850',
  bg: '#F7ECE1',
  border: '#E2D8CE',
  accent: '#5F7076',
  danger: '#B91C1C',
} as const;
