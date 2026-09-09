import { Platform, StyleSheet } from 'react-native';
import { WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import type { AppTheme } from '@/src/hooks/use-theme';

export function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 14,
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    progressTrack: {
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 999 },
    notice: { marginBottom: 4 },
    fieldBlock: { gap: 8 },
    stepLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 17,
      fontWeight: '600',
      color: colors.head,
      lineHeight: 24,
    },
    stepHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 4,
    },
    scalePreview: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.accent,
      lineHeight: 18,
      backgroundColor: colors.accentLight,
      borderRadius: 6,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.accentMid,
    },
    error: {
      fontFamily: fonts.sansSemiBold,
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    actions: { flexDirection: 'row', gap: 8 },
    secondaryBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
      minHeight: 44,
    },
    secondaryText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    primaryBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 6,
      backgroundColor: colors.accent,
      minHeight: 44,
    },
    primaryText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 14,
    },
    btnDisabled: { opacity: 0.45 },
    skipBtn: { alignItems: 'center', paddingVertical: 4 },
    skipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 4,
    },
    deleteText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.danger,
    },
    offLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}

export function createFieldStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    input: {
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: Platform.OS === 'web' ? WEB_INPUT_FONT_SIZE : 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    inputMultiline: { minHeight: 120, lineHeight: 22 },
    choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    choiceChip: {
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    choiceChipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    choiceText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    choiceTextActive: { color: colors.accent },
    photoWrap: { gap: 10 },
    photoHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    photoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    photoBtnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    photoThumbWrap: { width: 88, height: 88, borderRadius: 8, overflow: 'hidden' },
    photoThumb: { width: '100%', height: '100%' },
    photoRemove: { position: 'absolute', top: 2, right: 2 },
    photoEmpty: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textMuted,
    },
    btnDisabled: { opacity: 0.45 },
    checklistWrap: { gap: 10 },
    checklistDish: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.head,
    },
    checklistHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    offSource: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.accent,
      lineHeight: 16,
    },
    offLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    conflictDirect: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerLight,
    },
    conflictCross: {
      borderColor: colors.warning,
      backgroundColor: colors.warningLight,
    },
    conflictText: {
      color: colors.danger,
    },
    conflictCrossText: {
      color: colors.warning,
    },
    conflictBanner: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.danger,
      lineHeight: 18,
      marginTop: 4,
    },
  });
}

export function createLegacyStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 14,
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    cancelText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    input: {
      minHeight: 140,
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: Platform.OS === 'web' ? WEB_INPUT_FONT_SIZE : 15,
      fontFamily: fonts.sans,
      color: colors.text,
      lineHeight: 22,
    },
    error: {
      fontFamily: fonts.sansSemiBold,
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    primaryBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 6,
      backgroundColor: colors.accent,
      minHeight: 44,
    },
    primaryText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 15,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
    },
    deleteText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.danger,
    },
  });
}

export function createPefZoneStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      gap: 4,
    },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
  });
}

export type DiaryWizardStyles = ReturnType<typeof createStyles>;
export type DiaryFieldStyles = ReturnType<typeof createFieldStyles>;
export type DiaryLegacyStyles = ReturnType<typeof createLegacyStyles>;
export type DiaryPefZoneStyles = ReturnType<typeof createPefZoneStyles>;
