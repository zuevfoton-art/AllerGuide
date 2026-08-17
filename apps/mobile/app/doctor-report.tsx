import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { DOCTOR_REPORT_BLOCKS } from '@allerguide/core';
import { generateDoctorReportPdf } from '@/src/services/doctor-report-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { getPrescribedCourse } from '@/src/services/prescribed-therapy-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { DateTimeField } from '@/src/components/DateTimeField';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeReportBlockLabel } from '@/src/i18n/content';

const PERIODS = [7, 14, 30] as const;
type QuickPeriod = (typeof PERIODS)[number];

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DoctorReportScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t, content } = useTranslation();
  const localeContent = content();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const profileCapabilities = useMemo(
    () => (activeProfile ? getProfileCapabilities(activeProfile) : null),
    [activeProfile],
  );

  /**
   * Blocks visible in the UI = those whose id appears in profileCapabilities.reportBlockIds
   * PLUS blocks that are always shown regardless (notes, therapy when course exists).
   * Blocks absent from capabilities are hidden by default to reduce noise.
   */
  const visibleBlocks = useMemo(() => {
    if (!profileCapabilities) return DOCTOR_REPORT_BLOCKS;
    const capabilityIds = new Set(profileCapabilities.reportBlockIds);

    const hasTherapyCourse = activeProfileId
      ? Boolean(getPrescribedCourse(activeProfileId)?.drug?.trim())
      : false;

    return DOCTOR_REPORT_BLOCKS.filter((block) => {
      if (capabilityIds.has(block.id)) return true;
      // Always show therapy block when user has an active prescribed course
      if (block.id === 'therapy' && hasTherapyCourse) return true;
      // Always show notes — low-priority but not condition-gated
      if (block.id === 'notes') return true;
      // conditionPhenotypes and timeline are always useful
      if (block.id === 'conditionPhenotypes' || block.id === 'timeline') return true;
      return false;
    });
  }, [profileCapabilities, activeProfileId]);

  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod | 'custom'>(30);
  const [fromDate, setFromDate] = useState(isoDaysAgo(30));
  const [toDate, setToDate] = useState(isoToday());
  const [blockIds, setBlockIds] = useState<string[]>([]);

  useEffect(() => {
    if (!profileCapabilities) {
      setBlockIds([]);
      return;
    }
    const capabilityIds = new Set(profileCapabilities.reportBlockIds);
    // Pre-select only blocks visible in the UI
    setBlockIds(visibleBlocks.filter((b) => capabilityIds.has(b.id)).map((b) => b.id));
  }, [activeProfileId, profileCapabilities, visibleBlocks]);

  const [loading, setLoading] = useState(false);

  const toggleBlock = (id: string) => {
    setBlockIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const selectQuick = (days: QuickPeriod) => {
    setQuickPeriod(days);
    setFromDate(isoDaysAgo(days));
    setToDate(isoToday());
  };

  const generate = async () => {
    if (!activeProfileId || blockIds.length === 0) return;
    setLoading(true);
    try {
      if (quickPeriod === 'custom') {
        await generateDoctorReportPdf({
          profileId: activeProfileId,
          fromDate,
          toDate,
          blockIds,
        });
      } else {
        await generateDoctorReportPdf({
          profileId: activeProfileId,
          periodDays: quickPeriod,
          blockIds,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        onBack={() => router.back()}
        eyebrow={t('doctorReport.eyebrow')}
        title={t('doctorReport.title')}
        subtitle={t('doctorReport.subtitle')}
        right={<ProfileHeaderButton />}
      />

      <Text style={ui.sectionLabel}>{t('doctorReport.period')}</Text>
      <View style={ui.toggleRow}>
        {PERIODS.map((days) => (
          <Pressable
            key={days}
            style={[ui.toggle, quickPeriod === days && ui.toggleActive]}
            onPress={() => selectQuick(days)}>
            <Text style={[ui.toggleText, quickPeriod === days && ui.toggleTextActive]}>
              {days} {t('common.daysShort')}
            </Text>
          </Pressable>
        ))}
        <Pressable
          style={[ui.toggle, quickPeriod === 'custom' && ui.toggleActive]}
          onPress={() => setQuickPeriod('custom')}>
          <Text style={[ui.toggleText, quickPeriod === 'custom' && ui.toggleTextActive]}>
            {t('doctorReport.customPeriod')}
          </Text>
        </Pressable>
      </View>

      {quickPeriod === 'custom' ? (
        <View style={styles.rangeRow}>
          <DateTimeField
            label={t('doctorReport.fromDate')}
            value={fromDate}
            onChange={setFromDate}
            mode="date"
            maxYear={new Date().getFullYear()}
            testID="report-from-date"
          />
          <DateTimeField
            label={t('doctorReport.toDate')}
            value={toDate}
            onChange={setToDate}
            mode="date"
            maxYear={new Date().getFullYear()}
            testID="report-to-date"
          />
        </View>
      ) : null}

      <Text style={ui.sectionLabel}>{t('doctorReport.blocks')}</Text>
      <GlassCard padded={false}>
        {visibleBlocks.map((block, index) => (
          <Pressable
            key={block.id}
            style={[
              ui.feedRow,
              index < visibleBlocks.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
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
    checkLabel: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    rangeRow: { gap: 12 },
  });
}
