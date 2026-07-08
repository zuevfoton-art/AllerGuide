import Svg, { Circle, Path } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

type OnboardingWaveBackgroundProps = {
  /** Medical Calm mid blue — blob accent */
  calmMid: string;
  /** Medical Calm wash — soft blue fill */
  calmWash: string;
};

/** Organic blobs — Dual Calm ambient (medical blue, not Claro teal). */
export function OnboardingWaveBackground({ calmMid, calmWash }: OnboardingWaveBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <Path
          d="M-20 120 C80 40, 180 200, 320 90 S520 30, 420 180 S120 260, -20 200 Z"
          fill={calmWash}
          opacity={0.55}
        />
        <Path
          d="M-40 280 C120 180, 220 340, 380 250 S620 180, 500 320 S200 420, -40 360 Z"
          fill={calmMid}
          opacity={0.12}
        />
        <Circle cx="88%" cy="12%" r="56" fill={calmWash} opacity={0.45} />
        <Circle cx="8%" cy="78%" r="42" fill={calmMid} opacity={0.1} />
      </Svg>
    </View>
  );
}
