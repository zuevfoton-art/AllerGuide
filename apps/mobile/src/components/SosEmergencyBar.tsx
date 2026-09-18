import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { density, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, scaledTextProps } from '@/src/constants/typography';
import { pressedOpacity } from '@/src/constants/motion';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

const SOS_CIRCLE = 160;

type SosEmergencyBarProps = {
  emergencyLabel: string;
  /** Digits shown in the Figma center circle (e.g. 103 / 112). */
  emergencyNumber?: string;
  contactName?: string;
  contactPhone?: string;
  contactRelation?: string;
  callContactLabel: string;
  onCallEmergency: () => void;
  onCallContact: () => void;
  allContactsLabel?: string;
  onAllContacts?: () => void;
  sosLabel: string;
  pressHint: string;
  callHint: string;
};

/** Zip SOS circle 160 — call handlers unchanged. */
export function SosEmergencyBar({
  emergencyLabel,
  onCallEmergency,
  sosLabel,
  pressHint,
  callHint,
}: SosEmergencyBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      testID="sos-emergency-bar"
      style={styles.wrap}
      accessibilityRole="toolbar"
      accessibilityLabel={emergencyLabel}>
      <Pressable
        testID="sos-crisis-call"
        accessibilityRole="button"
        accessibilityLabel={emergencyLabel}
        onPress={onCallEmergency}
        style={({ pressed }) => [styles.circle, pressed && styles.pressed]}>
        <Text {...scaledTextProps} style={styles.sosText}>
          {sosLabel}
        </Text>
        <Text {...scaledTextProps} style={styles.sosSubtext}>
          {pressHint}
        </Text>
      </Pressable>
      <Text {...scaledTextProps} style={styles.hint}>
        {callHint}
      </Text>
    </View>
  );
}

function createStyles({ colors, fonts, shadows }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: space[4],
      alignItems: 'center',
      paddingVertical: space[8],
    },
    circle: {
      width: SOS_CIRCLE,
      height: SOS_CIRCLE,
      borderRadius: SOS_CIRCLE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.danger,
      minHeight: density.tapMinHeightCrisis,
      minWidth: density.tapMinHeightCrisis,
      ...(shadows.danger as object),
    },
    sosText: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.kpi,
      lineHeight: lineHeights.kpi,
      fontWeight: '800',
      color: colors.onDanger,
    },
    sosSubtext: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      color: colors.onDanger,
      opacity: 0.8,
      marginTop: space[1],
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.textSecondary,
    },
    pressed: { opacity: pressedOpacity },
  });
}
