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
  body: 15,
  h3: 18,
  h2: 22,
  h1: 26,
  display: 32,
  kpi: 36,
} as const;
