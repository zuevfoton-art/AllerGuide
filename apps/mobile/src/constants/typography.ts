/**
 * Aclearo Refuge type stack:
 * - display (Fraunces) — screen H1 and the daily reading, the «journal» voice;
 * - sans (Inter) — every control, chip, form and tab label;
 * - serif (Source Serif 4) — secondary headings inside cards.
 *
 * Web loads the families by their CSS names via the `<link>` in `app/+html.tsx`,
 * so tokens resolve to a font stack there. Native keeps the per-weight
 * `@expo-google-fonts` file names (see `use-fonts.ts`).
 */
const SANS_WEB = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const SERIF_WEB = '"Source Serif 4", Georgia, serif';
const DISPLAY_WEB = 'Fraunces, "Source Serif 4", Georgia, serif';

/** `document` stands in for `Platform.OS === 'web'`: this module must stay RN-free. */
const isWeb = typeof document !== 'undefined';

function family(nativeName: string, webStack: string): string {
  return isWeb ? webStack : nativeName;
}

export const fonts = {
  sans: family('Inter_400Regular', SANS_WEB),
  sansMedium: family('Inter_500Medium', SANS_WEB),
  sansSemiBold: family('Inter_600SemiBold', SANS_WEB),
  sansBold: family('Inter_700Bold', SANS_WEB),
  serif: family('SourceSerif4_600SemiBold', SERIF_WEB),
  serifBold: family('SourceSerif4_700Bold', SERIF_WEB),
  display: family('Fraunces_600SemiBold', DISPLAY_WEB),
  displayBold: family('Fraunces_700Bold', DISPLAY_WEB),
} as const;

export type AppFonts = typeof fonts;

export const fontSizes = {
  caption: 11,
  label: 12,
  bodySm: 13,
  bodyMd: 14,
  body: 15,
  h4: 16,
  h3: 18,
  h2: 22,
  h1: 26,
  display: 32,
  kpi: 36,
} as const;

/**
 * Comfortable line-heights: ~1.5 for body, ~1.25 for headings.
 * One token per font size so screens do not invent 18/19/20 literals.
 */
export const lineHeights = {
  caption: 16,
  label: 18,
  bodySm: 20,
  bodyMd: 21,
  body: 22,
  h4: 20,
  h3: 22,
  h2: 28,
  h1: 32,
  display: 40,
  kpi: 40,
  /** Reading paragraph — ≥1.5 so a long RU sentence stays calm. */
  reading: 27,
} as const;

export const tracking = {
  tight: -0.3,
  normal: 0,
  label: 0.5,
} as const;

/** Weight travels with the token: on web every family resolves to one file. */
type TextWeight = '400' | '500' | '600' | '700';

type TextStyleToken = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: TextWeight;
};

function textStyle(
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  letterSpacing: number = tracking.normal,
  fontWeight: TextWeight = '400',
): TextStyleToken {
  return { fontFamily, fontSize, lineHeight, letterSpacing, fontWeight };
}

export const textStyles = {
  caption: textStyle(fonts.sans, fontSizes.caption, lineHeights.caption),
  label: textStyle(fonts.sansSemiBold, fontSizes.label, lineHeights.label, tracking.label, '600'),
  bodySm: textStyle(fonts.sans, fontSizes.bodySm, lineHeights.bodySm),
  bodyMd: textStyle(fonts.sans, fontSizes.bodyMd, lineHeights.bodyMd),
  body: textStyle(fonts.sans, fontSizes.body, lineHeights.body),
  h4: textStyle(fonts.sansSemiBold, fontSizes.h4, lineHeights.h4, tracking.normal, '600'),
  h3: textStyle(fonts.serif, fontSizes.h3, lineHeights.h3, tracking.normal, '600'),
  h2: textStyle(fonts.serif, fontSizes.h2, lineHeights.h2, tracking.tight, '600'),
  h1: textStyle(fonts.displayBold, fontSizes.h1, lineHeights.h1, tracking.tight, '700'),
  /** Daily reading paragraph — display face at body scale, north-star §4.7. */
  reading: textStyle(fonts.display, fontSizes.h3, lineHeights.reading, tracking.normal, '600'),
  kpi: textStyle(fonts.sansBold, fontSizes.kpi, lineHeights.kpi, tracking.tight, '700'),
} as const;

export type TextStyleName = keyof typeof textStyles;

/**
 * Dynamic Type stays on (RN default `allowFontScaling`).
 * Cap the multiplier so Clinical Calm layouts do not overflow on large system fonts.
 */
export const MAX_FONT_SIZE_MULTIPLIER = 1.4;

export const scaledTextProps = {
  allowFontScaling: true,
  maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
} as const;

export const TEXT_SCALE_PRESETS = {
  regular: 1,
  large: 1.15,
  max: 1.3,
} as const;

export type TextScalePreset = keyof typeof TEXT_SCALE_PRESETS;
