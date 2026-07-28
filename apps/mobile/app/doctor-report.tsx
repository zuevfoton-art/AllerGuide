import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { DOCTOR_REPORT_BLOCKS as BLOCKS } from '@allerguide/core';
import { generateDoctorReportPdf } from '@/src/services/doctor-report-service';
import { getProfileCapabilities } from '@/src/services/profile-capabilities-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
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
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod | 'custom'>(30);
  const [fromDate, setFromDate] = useState(isoDaysAgo(30));
  const [toDate, setToDate] = useState(isoToday());
  const [blockIds, setBlockIds] = useState<string[]>([]);

  useEffect(() => {
    if (!profileCapabilities) {
      setBlockIds([]);
      return;
    }
    setBlockIds(profileCapabilities.reportBlockIds);
  }, [activeProfileId, profileCapabilities]);

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
    rangeRow: { gap: 12 },
  });
}
