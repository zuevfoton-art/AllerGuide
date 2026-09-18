/**
 * Figma Make zip type stack (`code-2.txt`): Work Sans for display, body, and UI.
 * Web loads the family via the `<link>` in `app/+html.tsx`.
 * Native keeps `@expo-google-fonts/work-sans` file names (see `use-fonts.ts`).
 */
const SANS_WEB = '"Work Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

/** `document` stands in for `Platform.OS === 'web'`: this module must stay RN-free. */
const isWeb = typeof document !== 'undefined';

function family(nativeName: string, webStack: string): string {
  return isWeb ? webStack : nativeName;
}

export const fonts = {
  sans: family('WorkSans_400Regular', SANS_WEB),
  sansMedium: family('WorkSans_500Medium', SANS_WEB),
  sansSemiBold: family('WorkSans_600SemiBold', SANS_WEB),
  sansBold: family('WorkSans_700Bold', SANS_WEB),
  serif: family('WorkSans_600SemiBold', SANS_WEB),
  serifBold: family('WorkSans_700Bold', SANS_WEB),
  display: family('WorkSans_600SemiBold', SANS_WEB),
  displayBold: family('WorkSans_700Bold', SANS_WEB),
} as const;

export type AppFonts = typeof fonts;

export const fontSizes = {
  tabLabel: 10,
  caption: 11,
  label: 12,
  bodySm: 13,
  bodyMd: 14,
  body: 14,
  h4: 18,
  h3: 20,
  h2: 22,
  h1: 28,
  display: 32,
  kpi: 36,
} as const;

/**
 * Zip leading: body 14/20, captions 11/16, headings ~1.2.
 */
export const lineHeights = {
  tabLabel: 12,
  caption: 16,
  label: 18,
  bodySm: 18,
  bodyMd: 20,
  body: 20,
  h4: 24,
  h3: 26,
  h2: 28,
  h1: 34,
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
  h4: textStyle(fonts.sansBold, fontSizes.h4, lineHeights.h4, tracking.normal, '700'),
  h3: textStyle(fonts.sansBold, fontSizes.h3, lineHeights.h3, tracking.normal, '700'),
  h2: textStyle(fonts.sansBold, fontSizes.h2, lineHeights.h2, tracking.tight, '700'),
  h1: textStyle(fonts.sansBold, fontSizes.h1, lineHeights.h1, tracking.tight, '700'),
  /** Daily reading paragraph — Work Sans at h3 scale. */
  reading: textStyle(fonts.sansSemiBold, fontSizes.h3, lineHeights.reading, tracking.normal, '600'),
  kpi: textStyle(fonts.sansBold, fontSizes.kpi, lineHeights.kpi, tracking.tight, '700'),
  tabLabel: textStyle(fonts.sansMedium, fontSizes.tabLabel, lineHeights.tabLabel, tracking.normal, '500'),
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
