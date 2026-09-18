import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/Button';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, scaledTextProps } from '@/src/constants/typography';
import { pressedOpacity } from '@/src/constants/motion';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

/** Figma `sos-button-wrapper` / `sos-inner-circle`. */
const SOS_CIRCLE_OUTER = 180;
const SOS_CIRCLE_INNER = 140;

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
};

/** Center danger circle (Figma) + contact CTAs — call handlers unchanged. */
export function SosEmergencyBar({
  emergencyLabel,
  emergencyNumber,
  contactName,
  contactPhone,
  contactRelation,
  callContactLabel,
  onCallEmergency,
  onCallContact,
  allContactsLabel,
  onAllContacts,
}: SosEmergencyBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasContact = Boolean(contactName && contactPhone);
  const numberLabel = (emergencyNumber ?? '').trim() || emergencyLabel;

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
        style={({ pressed }) => [styles.outerCircle, pressed && styles.pressed]}>
        <View style={styles.innerCircle}>
          <Ionicons name="warning" size={28} color={theme.colors.onDanger} />
          <Text {...scaledTextProps} style={styles.numberText} numberOfLines={1}>
            {numberLabel}
          </Text>
        </View>
      </Pressable>

      {hasContact ? (
        <View style={styles.contactRow}>
          <View style={styles.contactBody}>
            <Text style={styles.contactName} numberOfLines={1}>
              {contactName}
            </Text>
            {contactRelation ? (
              <Text style={styles.contactMeta} numberOfLines={1}>
                {contactRelation} · {contactPhone}
              </Text>
            ) : (
              <Text style={styles.contactMeta} numberOfLines={1}>
                {contactPhone}
              </Text>
            )}
          </View>
          <Button
            label={callContactLabel}
            variant="primary"
            accessibilityLabel={`${callContactLabel}: ${contactName}`}
            onPress={onCallContact}
          />
        </View>
      ) : null}
      {allContactsLabel && onAllContacts ? (
        <Pressable
          onPress={onAllContacts}
          style={styles.allContacts}
          accessibilityRole="button"
          accessibilityLabel={allContactsLabel}>
          <Text style={styles.allContactsText}>{allContactsLabel}</Text>
          <Ionicons name="chevron-forward" size={13} color={theme.colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts, shadows }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: space[3],
      alignItems: 'center',
      paddingVertical: space[2],
    },
    outerCircle: {
      width: SOS_CIRCLE_OUTER,
      height: SOS_CIRCLE_OUTER,
      borderRadius: SOS_CIRCLE_OUTER / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerLight,
      ...(shadows.raisedStrong as object),
    },
    innerCircle: {
      width: SOS_CIRCLE_INNER,
      height: SOS_CIRCLE_INNER,
      borderRadius: SOS_CIRCLE_INNER / 2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[1],
      backgroundColor: colors.danger,
      minHeight: density.tapMinHeightCrisis,
      minWidth: density.tapMinHeightCrisis,
    },
    numberText: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h2,
      lineHeight: lineHeights.h2,
      fontWeight: '800',
      color: colors.onDanger,
      textAlign: 'center',
    },
    pressed: { opacity: pressedOpacity },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      alignSelf: 'stretch',
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: space[3],
    },
    contactBody: { flex: 1, gap: 2, minWidth: 0 },
    contactName: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      fontWeight: '600',
      color: colors.text,
    },
    contactMeta: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      color: colors.textMuted,
    },
    allContacts: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[1],
      minHeight: density.tapMinHeightSm,
    },
    allContactsText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}
