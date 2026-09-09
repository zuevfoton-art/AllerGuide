/** Clinical Calm — Inter (UI) + Source Serif 4 (headings) */
export const fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  serif: 'SourceSerif4_600SemiBold',
  serifBold: 'SourceSerif4_700Bold',
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
} as const;

export const tracking = {
  tight: -0.3,
  normal: 0,
  label: 0.5,
} as const;

type TextStyleToken = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
};

function textStyle(
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  letterSpacing: number = tracking.normal,
): TextStyleToken {
  return { fontFamily, fontSize, lineHeight, letterSpacing };
}

export const textStyles = {
  caption: textStyle(fonts.sans, fontSizes.caption, lineHeights.caption),
  label: textStyle(fonts.sansSemiBold, fontSizes.label, lineHeights.label, tracking.label),
  bodySm: textStyle(fonts.sans, fontSizes.bodySm, lineHeights.bodySm),
  bodyMd: textStyle(fonts.sans, fontSizes.bodyMd, lineHeights.bodyMd),
  body: textStyle(fonts.sans, fontSizes.body, lineHeights.body),
  h4: textStyle(fonts.sansSemiBold, fontSizes.h4, lineHeights.h4),
  h3: textStyle(fonts.serif, fontSizes.h3, lineHeights.h3),
  h2: textStyle(fonts.serif, fontSizes.h2, lineHeights.h2, tracking.tight),
  h1: textStyle(fonts.serifBold, fontSizes.h1, lineHeights.h1, tracking.tight),
  kpi: textStyle(fonts.sansBold, fontSizes.kpi, lineHeights.kpi, tracking.tight),
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
