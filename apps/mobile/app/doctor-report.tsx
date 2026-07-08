import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { DOCTOR_REPORT_BLOCKS as BLOCKS, getDefaultReportBlockIds } from '@allerguide/core';
import { generateDoctorReportPdf } from '@/src/services/doctor-report-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeReportBlockLabel } from '@/src/i18n/content';

const PERIODS = [7, 14, 30] as const;
type ReportPeriod = (typeof PERIODS)[number];

export default function DoctorReportScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t, content } = useTranslation();
  const localeContent = content();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [period, setPeriod] = useState<ReportPeriod>(30);
  const [blockIds, setBlockIds] = useState<string[]>(getDefaultReportBlockIds());
  const [loading, setLoading] = useState(false);

  const toggleBlock = (id: string) => {
    setBlockIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const generate = async () => {
    if (!activeProfileId || blockIds.length === 0) return;
    setLoading(true);
    try {
      await generateDoctorReportPdf({ profileId: activeProfileId, periodDays: period, blockIds });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('doctorReport.eyebrow')} />
          <Text style={ui.docTitle}>{t('doctorReport.title')}</Text>
          <Text style={ui.docMeta}>{t('doctorReport.subtitle')}</Text>
        </View>
      </View>

      <ProfileSwitcher />

      <Text style={ui.sectionLabel}>{t('doctorReport.period')}</Text>
      <View style={ui.toggleRow}>
        {PERIODS.map((days) => (
          <Pressable
            key={days}
            style={[ui.toggle, period === days && ui.toggleActive]}
            onPress={() => setPeriod(days)}>
            <Text style={[ui.toggleText, period === days && ui.toggleTextActive]}>
              {days} {t('common.daysShort')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={ui.sectionLabel}>{t('doctorReport.blocks')}</Text>
      <GlassCard padded={false}>
        {BLOCKS.map((block, index) => (
          <Pressable
            key={block.id}
            style={[
              ui.feedRow,
              index < BLOCKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
            ]}
            onPress={() => toggleBlock(block.id)}>
            <Ionicons
              name={blockIds.includes(block.id) ? 'checkbox' : 'square-outline'}
              size={22}
              color={theme.colors.accent}
            />
            <Text style={styles.checkLabel}>
              {localizeReportBlockLabel(block.id, localeContent)}
            </Text>
          </Pressable>
        ))}
      </GlassCard>

      <Button
        label={loading ? t('doctorReport.generating') : t('doctorReport.generate')}
        variant="primary"
        block
        disabled={loading}
        onPress={() => void generate()}
      />

      <Disclaimer>{t('doctorReport.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 2,
    },
    headerText: { flex: 1, gap: 2 },
    checkLabel: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
  });
}
