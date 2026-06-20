import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { DOCTOR_REPORT_BLOCKS as BLOCKS, getDefaultReportBlockIds } from '@allerguide/core';
import { generateDoctorReportPdf } from '@/src/services/doctor-report-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { useGlassStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeReportBlockLabel } from '@/src/i18n/content';

const PERIODS = [7, 14, 30] as const;
type ReportPeriod = (typeof PERIODS)[number];

export default function DoctorReportScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const glass = useGlassStyles();
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
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.teal} />
        <Text style={styles.backText}>{t('doctorReport.back')}</Text>
      </Pressable>

      <ScreenHeader title={t('doctorReport.title')} subtitle={t('doctorReport.subtitle')} />

      <ProfileSwitcher />

      <Text style={glass.sectionLabel}>{t('doctorReport.period')}</Text>
      <View style={glass.toggleRow}>
        {PERIODS.map((days) => (
          <Pressable
            key={days}
            style={[glass.toggle, period === days && glass.toggleActive]}
            onPress={() => setPeriod(days)}>
            <Text style={[glass.toggleText, period === days && glass.toggleTextActive]}>
              {days} {t('common.daysShort')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={glass.sectionLabel}>{t('doctorReport.blocks')}</Text>
      <GlassCard padded={false}>
        {BLOCKS.map((block, index) => (
          <Pressable
            key={block.id}
            style={[
              glass.feedRow,
              index < BLOCKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
            ]}
            onPress={() => toggleBlock(block.id)}>
            <Ionicons
              name={blockIds.includes(block.id) ? 'checkbox' : 'square-outline'}
              size={22}
              color={theme.colors.teal}
            />
            <Text style={styles.checkLabel}>{localizeReportBlockLabel(block.id, localeContent)}</Text>
          </Pressable>
        ))}
      </GlassCard>

      <Pressable style={glass.primaryBtn} onPress={() => void generate()} disabled={loading}>
        <Text style={glass.primaryBtnText}>
          {loading ? t('doctorReport.generating') : t('doctorReport.generate')}
        </Text>
      </Pressable>

      <Text style={glass.disclaimer}>{t('doctorReport.disclaimer')}</Text>
    </Screen>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    backText: { color: colors.teal, fontWeight: '600', fontSize: 15 },
    checkLabel: { fontSize: 15, color: colors.text, fontWeight: '500', flex: 1 },
  });
}
