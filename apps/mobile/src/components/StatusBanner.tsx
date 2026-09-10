import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { useBannerStore, type BannerTone } from '@/src/store/banner-store';

type StatusBannerProps = {
  tone?: BannerTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
};

const TONE_ICON: Record<BannerTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

/** Non-blocking status / undo snackbar. Hosted by Screen via banner-store. */
export function StatusBanner({
  tone = 'info',
  message,
  actionLabel,
  onAction,
  onDismiss,
}: StatusBannerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, tone), [theme, tone]);
  const { t } = useTranslation();

  return (
    <View
      style={styles.wrap}
      testID="status-banner"
      collapsable={false}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Ionicons name={TONE_ICON[tone]} size={18} color={styles.icon.color} />
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.undoBtn}>
          <Text style={styles.undoText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable
          testID="status-banner-dismiss"
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('common.ok')}
          hitSlop={8}
          style={styles.dismissBtn}>
          <Ionicons name="close" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Transient snackbar with undo action (e.g. after deleting a safe product). */
export function UndoBanner({
  message,
  actionLabel,
  onUndo,
  onDismiss,
}: {
  message: string;
  actionLabel: string;
  onUndo: () => void;
  onDismiss?: () => void;
}) {
  return (
    <StatusBanner
      tone="info"
      message={message}
      actionLabel={actionLabel}
      onAction={onUndo}
      onDismiss={onDismiss}
    />
  );
}

export function StatusBannerHost() {
  const banner = useBannerStore((s) => s.banner);
  const hide = useBannerStore((s) => s.hide);
  if (!banner) return null;
  return (
    <View pointerEvents="box-none" style={hostStyles.host}>
      <StatusBanner
        tone={banner.tone}
        message={banner.message}
        actionLabel={banner.actionLabel}
        onAction={
          banner.onAction
            ? () => {
                banner.onAction?.();
                hide();
              }
            : undefined
        }
        onDismiss={hide}
      />
    </View>
  );
}

const hostStyles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    zIndex: 40,
  },
});

function createStyles({ colors, fonts, shadows }: AppTheme, tone: BannerTone) {
  const accent =
    tone === 'success' ? colors.success : tone === 'error' ? colors.danger : colors.accent;
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.head,
      borderRadius: radii.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      ...(shadows.md as object),
    },
    icon: { color: accent },
    message: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.onAccent,
    },
    undoBtn: { paddingVertical: 4, paddingHorizontal: 2 },
    undoText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      fontWeight: '700',
      color: colors.accent,
    },
    dismissBtn: { padding: 2 },
  });
}
