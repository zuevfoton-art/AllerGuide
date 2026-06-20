import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export function useGlassStyles() {
  const theme = useTheme();
  return useMemo(() => createGlassStyles(theme), [theme]);
}

function createGlassStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    sectionLink: { fontSize: 14, fontWeight: '700', color: colors.teal },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.glass as object),
    },
    pillText: { fontSize: 13, fontWeight: '700', color: colors.text },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    feedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    feedIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.tealLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feedBody: { flex: 1, gap: 2 },
    feedTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    feedSub: { fontSize: 13, color: colors.textMuted },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...(shadows.glass as object),
    },
    primaryBtn: {
      backgroundColor: colors.teal,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      ...(shadows.glass as object),
    },
    primaryBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggle: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    toggleActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
    toggleText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    toggleTextActive: { color: colors.teal, fontWeight: '700' },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    secondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.card,
      padding: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.glass as object),
    },
    secondaryBtnText: { color: colors.teal, fontWeight: '700', fontSize: 14 },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  });
}
