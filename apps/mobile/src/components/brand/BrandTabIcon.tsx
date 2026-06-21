import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type BrandTabIconName = 'home' | 'diary' | 'scanner' | 'sos';
export type BrandFeatureIconName = 'market' | 'map' | 'expert';

type BrandIconProps = {
  size?: number;
  color: string;
  focused?: boolean;
};

const STROKE = 1.75;

export function BrandTabIcon({
  name,
  size = 24,
  color,
  focused = false,
}: BrandIconProps & { name: BrandTabIconName }) {
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4.5 10.5 12 5l7.5 5.5"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M6.5 10.5V18.5h11V10.5"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={focused ? color : 'none'}
            fillOpacity={focused ? 0.12 : 0}
          />
          <Path d="M10 18.5v-4h4v4" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
        </Svg>
      );
    case 'diary':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x={6.5}
            y={4.5}
            width={11}
            height={16}
            rx={1.5}
            stroke={color}
            strokeWidth={STROKE}
            fill={focused ? color : 'none'}
            fillOpacity={focused ? 0.12 : 0}
          />
          <Path d="M9 4.5V3.5h6v1" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
          <Path d="M9 10h6M9 13.5h6M9 17h4" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
        </Svg>
      );
    case 'scanner':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M7 5H5v2M17 5h2v2M7 19H5v-2M17 19h2v-2" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
          <Path d="M8 12h8" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
        </Svg>
      );
    case 'sos':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle
            cx={12}
            cy={12}
            r={8.25}
            stroke={color}
            strokeWidth={STROKE}
            fill={focused ? color : 'none'}
            fillOpacity={focused ? 0.15 : 0}
          />
          <Path d="M12 8.25v7.5M8.25 12h7.5" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
}

export function BrandFeatureIcon({
  name,
  size = 24,
  color,
}: BrandIconProps & { name: BrandFeatureIconName }) {
  switch (name) {
    case 'market':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M8 9h8l.9 10H7.1L8 9Z"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          <Path
            d="M9.5 9V7.5a2.75 2.75 0 0 1 5.5 0V9"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'map':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 5.5 5 7v13l4-1.5M9 5.5l6 2M9 5.5v13M15 7.5l4 1.5v13l-4-1.5M15 7.5v13"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'expert':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 4.5 14.5 9H19l-3.75 2.7 1.4 4.3L12 13.8 7.35 16l1.4-4.3L5 9h4.5L12 4.5Z"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
        </Svg>
      );
    default:
      return null;
  }
}

/** Intro carousel: maps slide keys to brand icons */
export function BrandSlideIcon({
  slide,
  size = 32,
  color,
}: {
  slide: 'diary' | 'scanner' | 'market' | 'map' | 'expert';
  size?: number;
  color: string;
}) {
  if (slide === 'diary' || slide === 'scanner') {
    return <BrandTabIcon name={slide} size={size} color={color} focused />;
  }
  return <BrandFeatureIcon name={slide} size={size} color={color} />;
}
