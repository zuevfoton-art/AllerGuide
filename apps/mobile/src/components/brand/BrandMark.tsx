import Svg, { Path, Rect } from 'react-native-svg';

type BrandMarkProps = {
  size?: number;
  /** Filled mark on accent square (default) or monochrome shield + cross */
  variant?: 'filled' | 'mono';
  color?: string;
  accent?: string;
};

/** AllerGuide logomark — shield + medical cross (Clinical Calm brandbook) */
export function BrandMark({
  size = 64,
  variant = 'filled',
  color = '#FFFFFF',
  accent = '#2563EB',
}: BrandMarkProps) {
  const shieldPath =
    'M32 13.5 46.5 19v13.2c0 8.4-11 15.3-14.5 17.3-3.5-2-14.5-8.9-14.5-17.3V19L32 13.5Z';

  if (variant === 'mono') {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Path
          d={shieldPath}
          stroke={color}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        <Path
          d="M32 22.5v16M24 30.5h16"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect width={64} height={64} rx={14} fill={accent} />
      <Path
        d={shieldPath}
        fill={`${color}22`}
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <Path
        d="M32 22.5v16M24 30.5h16"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}
