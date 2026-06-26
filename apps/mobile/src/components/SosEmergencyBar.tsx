import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/src/components/Button';
import { radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type SosEmergencyBarProps = {
  emergencyLabel: string;
  contactName?: string;
  contactPhone?: string;
  contactRelation?: string;
  callContactLabel: string;
  onCallEmergency: () => void;
  onCallContact: () => void;
};

/** Pinned emergency actions — 103 + optional first contact, always visible while scrolling. */
export function SosEmergencyBar({
  emergencyLabel,
  contactName,
  contactPhone,
  contactRelation,
  callContactLabel,
  onCallEmergency,
  onCallContact,
}: SosEmergencyBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasContact = Boolean(contactName && contactPhone);

  return (
    <View style={styles.wrap} accessibilityRole="toolbar" accessibilityLabel={emergencyLabel}>
      <Button label={emergencyLabel} variant="danger" block onPress={onCallEmergency} />
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
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      padding: 12,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    contactBody: { flex: 1, gap: 2, minWidth: 0 },
    contactName: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    contactMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
