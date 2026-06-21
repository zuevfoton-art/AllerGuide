import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type BrandTabIconName = 'home' | 'diary' | 'scanner' | 'sos';

type BrandTabIconProps = {
  name: BrandTabIconName;
  size?: number;
  color: string;
  focused?: boolean;
};

const STROKE = 1.75;

export function BrandTabIcon({ name, size = 24, color, focused = false }: BrandTabIconProps) {
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
