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
  const shield = (
  <>
    <Path
      d="M22 10L32 16V28L22 34L12 28V16L22 10Z"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Path
      d="M17 22h10M22 17v10"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  </>
  );

  if (variant === 'mono') {
    return (
      <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
        {shield}
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <Rect width={44} height={44} rx={10} fill={accent} />
      {shield}
    </Svg>
  );
}
