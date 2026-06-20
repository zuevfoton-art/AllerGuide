import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  DOCTOR_REPORT_BLOCKS as BLOCKS,
  generateDoctorReportPdf,
  getDefaultReportBlockIds,
} from '@/src/services/doctor-report-service';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

const PERIODS = [7, 14, 30] as const;
type ReportPeriod = (typeof PERIODS)[number];

export default function DoctorReportScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
        <Ionicons name="chevron-back" size={18} color={theme.colors.accent} />
        <Text style={styles.backText}>Дневник</Text>
      </Pressable>

      <Text style={styles.title}>Отчёт для врача</Text>
      <Text style={styles.subtitle}>Выберите период и блоки для PDF</Text>

      <ProfileSwitcher />

      <Text style={styles.sectionLabel}>Период</Text>
      <View style={styles.row}>
        {PERIODS.map((days) => (
          <Pressable
            key={days}
            style={[styles.chip, period === days && styles.chipActive]}
            onPress={() => setPeriod(days)}>
            <Text style={[styles.chipText, period === days && styles.chipTextActive]}>{days} дн.</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Блоки отчёта</Text>
      {BLOCKS.map((block) => (
        <Pressable key={block.id} style={styles.checkRow} onPress={() => toggleBlock(block.id)}>
          <Ionicons
            name={blockIds.includes(block.id) ? 'checkbox' : 'square-outline'}
            size={22}
            color={theme.colors.accent}
          />
          <Text style={styles.checkLabel}>{block.label}</Text>
        </Pressable>
      ))}

      <Pressable style={styles.primaryBtn} onPress={() => void generate()} disabled={loading}>
        <Ionicons name="document-text" size={18} color={theme.colors.onAccent} />
        <Text style={styles.primaryText}>{loading ? 'Формирование…' : 'Сформировать PDF'}</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        Отчёт сформирован на основе самостоятельно введённых данных и не является медицинской документацией.
      </Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    backText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
    title: { fontSize: 28, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 12,
      marginBottom: 8,
    },
    row: { flexDirection: 'row', gap: 8 },
    chip: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    chipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    chipText: { fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: colors.accent },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    checkLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.accent,
      padding: 16,
      borderRadius: 16,
      marginTop: 16,
      ...(shadows.accent as object),
    },
    primaryText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginTop: 12 },
  });
}
