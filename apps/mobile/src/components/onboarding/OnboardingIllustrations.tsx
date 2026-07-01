import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

type IllustrationProps = {
  width?: number;
  height?: number;
  stroke?: string;
  accent?: string;
  accentLight?: string;
};

const DEFAULT_W = 280;
const DEFAULT_H = 220;

/** Slide 1 — allergy profile setup with floating safety icons */
export function ProfileSetupIllustration({
  width = DEFAULT_W,
  height = DEFAULT_H,
  stroke = '#0F172A',
  accent = '#2563EB',
  accentLight = '#EFF6FF',
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220" fill="none">
      <Circle cx="140" cy="118" r="78" fill={accentLight} opacity={0.65} />
      <Path
        d="M92 78c8-18 28-28 48-28s40 10 48 28"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Circle cx="140" cy="52" r="18" stroke={stroke} strokeWidth={2.2} />
      <Path
        d="M108 92c6 34 16 52 32 58s26-24 32-58"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Rect x="168" y="96" width="54" height="68" rx="8" stroke={stroke} strokeWidth={2.2} fill="#FFFFFF" />
      <Line x1="178" y1="112" x2="212" y2="112" stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
      <Line x1="178" y1="126" x2="204" y2="126" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" opacity={0.45} />
      <Line x1="178" y1="138" x2="208" y2="138" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" opacity={0.45} />
      <Circle cx="72" cy="64" r="18" fill={accentLight} stroke={stroke} strokeWidth={1.8} />
      <Path d="M72 58v12M66 64h12" stroke={accent} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx="214" cy="58" r="16" stroke={stroke} strokeWidth={1.8} fill="#FFFFFF" />
      <Path d="M207 58l5 5 10-11" stroke={accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M58 148 72 134h20l10 14v18H58V148Z"
        stroke={stroke}
        strokeWidth={1.8}
        fill={accent}
        opacity={0.18}
      />
      <Ellipse cx="82" cy="176" rx="10" ry="4" fill={stroke} opacity={0.08} />
    </Svg>
  );
}

/** Slide 2 — barcode scan with instant safety check */
export function ScannerIllustration({
  width = DEFAULT_W,
  height = DEFAULT_H,
  stroke = '#0F172A',
  accent = '#2563EB',
  accentLight = '#EFF6FF',
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220" fill="none">
      <Rect x="78" y="44" width="96" height="118" rx="10" stroke={stroke} strokeWidth={2.2} fill="#FFFFFF" />
      <Rect x="92" y="58" width="68" height="44" rx="4" fill={accentLight} />
      <Line x1="96" y1="66" x2="156" y2="66" stroke={stroke} strokeWidth={1.4} opacity={0.35} />
      <Line x1="96" y1="76" x2="148" y2="76" stroke={stroke} strokeWidth={1.4} opacity={0.35} />
      <Line x1="96" y1="86" x2="152" y2="86" stroke={stroke} strokeWidth={1.4} opacity={0.35} />
      <Rect x="98" y="112" width="56" height="34" rx="3" stroke={stroke} strokeWidth={1.6} />
      <Line x1="102" y1="118" x2="102" y2="140" stroke={stroke} strokeWidth={2.2} />
      <Line x1="108" y1="118" x2="108" y2="140" stroke={stroke} strokeWidth={1.2} />
      <Line x1="114" y1="118" x2="114" y2="140" stroke={stroke} strokeWidth={2.6} />
      <Line x1="120" y1="118" x2="120" y2="140" stroke={stroke} strokeWidth={1.2} />
      <Line x1="126" y1="118" x2="126" y2="140" stroke={stroke} strokeWidth={2.2} />
      <Line x1="132" y1="118" x2="132" y2="140" stroke={stroke} strokeWidth={1.6} />
      <Line x1="138" y1="118" x2="138" y2="140" stroke={stroke} strokeWidth={2.8} />
      <Line x1="144" y1="118" x2="144" y2="140" stroke={stroke} strokeWidth={1.2} />
      <Path
        d="M186 72h34a8 8 0 0 1 8 8v72a8 8 0 0 1-8 8h-34"
        stroke={accent}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Path
        d="M94 72H60a8 8 0 0 0-8 8v72a8 8 0 0 0 8 8h34"
        stroke={accent}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Line x1="60" y1="108" x2="228" y2="108" stroke={accent} strokeWidth={2} strokeDasharray="6 5" />
      <Rect x="188" y="128" width="58" height="96" rx="12" stroke={stroke} strokeWidth={2.2} fill="#FFFFFF" />
      <Circle cx="217" cy="148" r="10" fill={accentLight} />
      <Rect x="202" y="164" width="30" height="22" rx="4" stroke={stroke} strokeWidth={1.6} />
      <Circle cx="48" cy="156" r="22" fill={accentLight} stroke={stroke} strokeWidth={1.8} />
      <Path d="M48 148v16M40 156h16" stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Slide 3 — daily protection umbrella with diary & wellness */
export function DailyCareIllustration({
  width = DEFAULT_W,
  height = DEFAULT_H,
  stroke = '#0F172A',
  accent = '#2563EB',
  accentLight = '#EFF6FF',
}: IllustrationProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 220" fill="none">
      <Path
        d="M42 118c38-52 158-52 196 0"
        stroke={accent}
        strokeWidth={3}
        strokeLinecap="round"
        fill={accent}
        fillOpacity={0.12}
      />
      <Line x1="140" y1="118" x2="140" y2="168" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx="108" cy="150" r="14" stroke={stroke} strokeWidth={2} />
      <Path d="M96 168c4 10 12 16 12 16s8-6 12-16" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="140" cy="142" r="16" stroke={stroke} strokeWidth={2} />
      <Path d="M126 162c6 12 14 18 14 18s8-6 14-18" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="172" cy="150" r="14" stroke={stroke} strokeWidth={2} />
      <Path d="M160 168c4 10 12 16 12 16s8-6 12-16" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Rect x="196" y="132" width="44" height="52" rx="6" stroke={stroke} strokeWidth={1.8} fill="#FFFFFF" />
      <Line x1="206" y1="146" x2="230" y2="146" stroke={accent} strokeWidth={2} strokeLinecap="round" />
      <Line x1="206" y1="158" x2="224" y2="158" stroke={stroke} strokeWidth={1.4} opacity={0.4} />
      <Line x1="206" y1="168" x2="228" y2="168" stroke={stroke} strokeWidth={1.4} opacity={0.4} />
      <Circle cx="58" cy="132" r="18" fill={accentLight} stroke={stroke} strokeWidth={1.6} />
      <Path
        d="M58 126c0-4 3-7 6-7s6 3 6 7-3 8-6 12c-3-4-6-8-6-12Z"
        fill={accent}
        opacity={0.85}
      />
      <Circle cx="228" cy="64" r="14" stroke={stroke} strokeWidth={1.6} fill="#FFFFFF" />
      <Path d="M222 66a6 6 0 1 0 12 0" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx="234" cy="62" r="1.6" fill={stroke} />
      <Circle cx="238" cy="66" r="1.6" fill={stroke} />
    </Svg>
  );
}

export type OnboardingSlideKey = 'profile' | 'scanner' | 'care';

export function OnboardingIllustration({
  slide,
  ...props
}: IllustrationProps & { slide: OnboardingSlideKey }) {
  switch (slide) {
    case 'profile':
      return <ProfileSetupIllustration {...props} />;
    case 'scanner':
      return <ScannerIllustration {...props} />;
    case 'care':
      return <DailyCareIllustration {...props} />;
  }
}
