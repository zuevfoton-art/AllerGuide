export const MOBILE_WEB_MAX_WIDTH = 480;
export const TABLET_WEB_MAX_WIDTH = 720;
export const COMPACT_BREAKPOINT = 360;
export const TABLET_BREAKPOINT = 768;
export const WEB_TAB_BAR_HEIGHT = 68;
export const WEB_INPUT_FONT_SIZE = 16;

/** Clinical Calm spacing & radii — from brandbook tokens */
export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
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

/** Brand hex for static HTML/PDF exports (mirrors light theme) */
export const brandReportColors = {
  text: '#0F172A',
  head: '#1E3A5F',
  muted: '#64748B',
  bg: '#F4F6F9',
  border: '#E2E8F0',
  accent: '#2563EB',
  danger: '#B91C1C',
} as const;
