import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  formatDiaryDate,
  type SafeProduct,
  type ScanHistoryEntry,
  type ScannerMode,
  type ScanTrendsSummary,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { useTheme } from '@/src/hooks/use-theme';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';
import { SCANNER_MODE_LABEL_KEYS } from '@/src/constants/scanner-mode';
import type { ScanResultExtended } from '@/src/services/scanner-service';
import { scanSourceLabelKey, type ScannerListTab } from '@/src/components/scanner/scanner-display';
import { createStyles } from '@/src/components/scanner/scanner-styles';

type Props = {
  listTab: ScannerListTab;
  onListTabChange: (tab: ScannerListTab) => void;
  scanTrends: ScanTrendsSummary;
  trendsOpen: boolean;
  onToggleTrends: () => void;
  history: ScanHistoryEntry[];
  recentHistory: ScanHistoryEntry[];
  safeList: SafeProduct[];
  onOpenHistoryItem: (item: ScanHistoryEntry) => void;
  onRemoveSafe: (item: SafeProduct) => void;
};

export function ScannerLists({
  listTab,
  onListTabChange,
  scanTrends,
  trendsOpen,
  onToggleTrends,
  history,
  recentHistory,
  safeList,
  onOpenHistoryItem,
  onRemoveSafe,
}: Props) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  return (
    <>
      {scanTrends.totalScans > 0 ? (
        <GlassCard>
          <Pressable
            onPress={onToggleTrends}
            style={styles.trendsToggle}
            accessibilityRole="button"
            hitSlop={8}>
            <Text style={ui.cardTitle}>
              {trendsOpen ? t('scanner.trendsHide') : t('scanner.trendsShow')}
            </Text>
            <Ionicons
              name={trendsOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>
          {trendsOpen ? (
            <>
              <Text style={styles.trendMeta}>
                {t('scanner.historyMeta', {
                  total: String(scanTrends.totalScans),
                  highRisk: String(scanTrends.highRiskCount),
                })}
              </Text>
              {scanTrends.topAllergens.map((item) => (
                <Text key={item.allergenId} style={styles.trendRow}>
                  {item.label}: {item.count}
                </Text>
              ))}
            </>
          ) : null}
        </GlassCard>
      ) : null}

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabChip, listTab === 'recent' && styles.tabChipActive]}
          onPress={() => onListTabChange('recent')}
          accessibilityRole="button"
          accessibilityState={{ selected: listTab === 'recent' }}
          hitSlop={8}>
          <Text style={[styles.tabChipText, listTab === 'recent' && styles.tabChipTextActive]}>
            {t('scanner.recentTab')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabChip, listTab === 'saved' && styles.tabChipActive]}
          onPress={() => onListTabChange('saved')}
          accessibilityRole="button"
          accessibilityState={{ selected: listTab === 'saved' }}
          hitSlop={8}>
          <Text style={[styles.tabChipText, listTab === 'saved' && styles.tabChipTextActive]}>
            {t('scanner.savedTab')}
          </Text>
        </Pressable>
      </View>

      {listTab === 'recent' ? (
        history.length > 0 ? (
          <GlassCard padded={false}>
            {recentHistory.map((item, index) => {
              const levelColor =
                item.level === 'high'
                  ? theme.colors.danger
                  : item.level === 'medium'
                    ? theme.colors.warning
                    : theme.colors.success;
              return (
                <Pressable
                  key={item.id}
                  testID={`scanner-history-${item.id}`}
                  onPress={() => onOpenHistoryItem(item)}
                  style={[styles.historyRow, index < history.length - 1 && styles.historyRowBorder]}
                  accessibilityRole="button">
                  <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
                  <View style={ui.feedBody}>
                    <Text style={ui.feedTitle}>{item.productName || item.verdict}</Text>
                    <Text style={ui.feedSub}>
                      {formatDiaryDate(item.createdAt)} ·{' '}
                      {t(scanSourceLabelKey(item.source as ScanResultExtended['source']))}
                    </Text>
                  </View>
                  <Text style={styles.rescanLink}>{t('scanner.rescanHistory')}</Text>
                </Pressable>
              );
            })}
          </GlassCard>
        ) : (
          <Text style={styles.emptyHint}>{t('scanner.emptyHint')}</Text>
        )
      ) : safeList.length > 0 ? (
        <GlassCard padded={false}>
          {safeList.map((item, index) => {
            const modeLabelKey = SCANNER_MODE_LABEL_KEYS[item.mode as ScannerMode];
            return (
              <View
                key={item.id}
                style={[styles.listRow, index < safeList.length - 1 && styles.historyRowBorder]}>
                <View style={ui.feedIcon}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                </View>
                <View style={ui.feedBody}>
                  <Text style={ui.feedTitle}>{item.name}</Text>
                  <Text style={ui.feedSub}>
                    {modeLabelKey ? t(modeLabelKey) : item.mode}
                    {' · '}
                    {formatDiaryDate(item.savedAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onRemoveSafe(item)}
                  hitSlop={8}
                  style={styles.removeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('scanner.removeSafe')}>
                  <Ionicons name="close-circle-outline" size={22} color={theme.colors.textMuted} />
                </Pressable>
              </View>
            );
          })}
        </GlassCard>
      ) : (
        <Text style={styles.emptyHint}>{t('scanner.safeListEmpty')}</Text>
      )}
    </>
  );
}
