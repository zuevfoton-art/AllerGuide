import Svg, { Path, Rect } from 'react-native-svg';

type BrandMarkProps = {
  size?: number;
  /** Filled monogram on accent square (default) or monochrome */
  variant?: 'filled' | 'mono';
  color?: string;
  accent?: string;
};

/** A-Claro monogram — bold **A** on Claro Teal (Aclearo brandbook) */
export function BrandMark({
  size = 64,
  variant = 'filled',
  color = '#FFFFFF',
  accent = '#2A9D8F',
}: BrandMarkProps) {
  const aPath =
    'M32 15 48.5 49H42.2L39.2 41.5H24.8L21.8 49H15.5L32 15ZM26.8 36.5H37.2L32 23.5 26.8 36.5Z';

  if (variant === 'mono') {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Path d={aPath} fill={color} fillRule="evenodd" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect width={64} height={64} rx={14} fill={accent} />
      <Path d={aPath} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
