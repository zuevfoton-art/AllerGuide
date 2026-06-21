import Svg, { Path, Rect } from 'react-native-svg';

type BrandMarkProps = {
  size?: number;
  /** Filled mark on accent square (default) or monochrome for inline use */
  variant?: 'filled' | 'mono';
  color?: string;
  accent?: string;
};

/** AllerGuide logomark — shield + checklist check (Clinical Calm) */
export function BrandMark({
  size = 64,
  variant = 'filled',
  color = '#FFFFFF',
  accent = '#2563EB',
}: BrandMarkProps) {
  if (variant === 'mono') {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Path
          d="M32 13.5 46.5 19v13.2c0 8.4-11 15.3-14.5 17.3-3.5-2-14.5-8.9-14.5-17.3V19L32 13.5Z"
          stroke={color}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        <Path d="M24 28.5h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" opacity={0.55} />
        <Path
          d="M24.5 34.5 29.5 39.5 40 27"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect width={64} height={64} rx={8} fill={accent} />
      <Path
        d="M32 13.5 46.5 19v13.2c0 8.4-11 15.3-14.5 17.3-3.5-2-14.5-8.9-14.5-17.3V19L32 13.5Z"
        stroke={color}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <Path d="M24 28.5h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" opacity={0.55} />
      <Path
        d="M24.5 34.5 29.5 39.5 40 27"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
