import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  POLLEN_TYPE_GROUP_BY_TAXON,
  type PollenMapTaxonId,
  type PollenPlantDetail,
  type PollenTierLevel,
  type PollenTypeGroup,
  type PollenUpiSnapshot,
} from '@allerguide/core';
import { PollenPlantSheet } from '@/src/components/PollenPlantSheet';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { POLLEN_TYPE_LABEL_KEYS } from '@/src/constants/pollen-taxon-labels';
import type { MapAllergenChipItem } from '@/src/components/MapAllergenChips';

const TYPE_GROUP_ORDER: PollenTypeGroup[] = ['TREE', 'GRASS', 'WEED'];

interface MapPollenAllergenModalProps {
  visible: boolean;
  items: MapAllergenChipItem[];
  selectedTaxonId: PollenMapTaxonId;
  plants: Partial<Record<PollenMapTaxonId, PollenPlantDetail>>;
  upiByTaxon?: Partial<Record<PollenMapTaxonId, PollenUpiSnapshot>>;
  labelForTaxon: (taxonId: PollenMapTaxonId) => string;
  onSelect: (taxonId: PollenMapTaxonId) => void;
  onClose: () => void;
}

export function MapPollenAllergenModal({
  visible,
  items,
  selectedTaxonId,
  plants,
  upiByTaxon,
  labelForTaxon,
  onSelect,
  onClose,
}: MapPollenAllergenModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [infoTaxonId, setInfoTaxonId] = useState<PollenMapTaxonId | null>(null);

  useEffect(() => {
    if (!visible) setInfoTaxonId(null);
  }, [visible]);

  const groupedItems = useMemo(
    () =>
      TYPE_GROUP_ORDER.map((group) => ({
        group,
        items: items.filter(
          (item) => POLLEN_TYPE_GROUP_BY_TAXON[item.taxonId] === group,
        ),
      })).filter((section) => section.items.length > 0),
    [items],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        if (infoTaxonId) {
          setInfoTaxonId(null);
          return;
        }
        onClose();
      }}>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          accessibilityViewIsModal
          testID="map-pollen-allergen-modal">
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.header}>
            {infoTaxonId ? (
              <Pressable
                style={styles.headerBtn}
                onPress={() => setInfoTaxonId(null)}
                accessibilityRole="button"
                accessibilityLabel={t('map.allergenPickerBack')}>
                <Ionicons name="chevron-back" size={20} color={theme.colors.accent} />
                <Text style={styles.headerBtnText}>{t('map.allergenPickerBack')}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.headerBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}>
                <Text style={styles.headerBtnText}>{t('common.cancel')}</Text>
              </Pressable>
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>
              {infoTaxonId
                ? labelForTaxon(infoTaxonId)
                : t('map.allergenPickerTitle')}
            </Text>
            <View style={styles.headerBtn} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            bounces={false}>
            {infoTaxonId ? (
              <PollenPlantSheet
                detail={plants[infoTaxonId] ?? null}
                upi={upiByTaxon?.[infoTaxonId] ?? null}
              />
            ) : (
              <>
                {groupedItems.map((section) => (
                  <View key={section.group} style={styles.groupBlock}>
                    <Text
                      style={styles.groupTitle}
                      testID={`map-allergen-group-${section.group.toLowerCase()}`}>
                      {t(POLLEN_TYPE_LABEL_KEYS[section.group] as 'map.pollenTypeTree')}
                      {' · '}
                      {t('map.groupCount', { count: String(section.items.length) })}
                    </Text>
                    {section.items.map((item) => {
                      const isSelected = item.taxonId === selectedTaxonId;
                      const dotColor = levelColor(item.level, theme);
                      return (
                        <View
                          key={item.taxonId}
                          style={[styles.row, isSelected && styles.rowSelected]}>
                          <Pressable
                            style={styles.rowMain}
                            onPress={() => {
                              onSelect(item.taxonId);
                              onClose();
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            testID={`map-allergen-option-${item.taxonId}`}>
                            <View style={[styles.dot, { backgroundColor: dotColor }]} />
                            <Text style={[styles.label, isSelected && styles.labelSelected]}>
                              {labelForTaxon(item.taxonId)}
                            </Text>
                            {item.profileRelevant ? (
                              <Text style={styles.you}>{t('map.pollenYou')}</Text>
                            ) : null}
                            <Text style={styles.status}>
                              {item.dataStatus === 'live'
                                ? t('map.dataStatusLive')
                                : item.dataStatus === 'google-only'
                                  ? t('map.dataStatusGoogleOnly')
                                  : t('map.dataStatusNone')}
                            </Text>
                            {isSelected ? (
                              <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                            ) : null}
                          </Pressable>
                          <Pressable
                            style={styles.infoBtn}
                            onPress={() => setInfoTaxonId(item.taxonId)}
                            accessibilityRole="button"
                            accessibilityLabel={t('map.allergenInfoA11y', {
                              taxon: labelForTaxon(item.taxonId),
                            })}
                            testID={`map-allergen-info-${item.taxonId}`}>
                            <Ionicons
                              name="help-circle-outline"
                              size={22}
                              color={theme.colors.accent}
                            />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ))}
                <Text style={styles.treeHint} testID="map-tree-species-levels-hint">
                  {t('map.pollenTreeSpeciesLevelsHint')}
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function levelColor(level: PollenTierLevel | null | undefined, theme: AppTheme): string {
  if (level === 'high') return theme.colors.danger;
  if (level === 'mid') return theme.colors.warning;
  if (level === 'low') return theme.colors.success;
  return theme.colors.textMuted;
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    sheet: {
      maxHeight: '78%',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
    },
    grabberWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
    grabber: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingVertical: 8,
    },
    headerBtn: {
      minWidth: 72,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    headerBtnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.accent,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      color: colors.head,
    },
    scroll: { flexGrow: 0 },
    scrollContent: { gap: 8, paddingBottom: 8 },
    groupBlock: { gap: 8 },
    groupTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginTop: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      minHeight: 48,
      paddingLeft: 12,
      paddingRight: 4,
    },
    rowSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    rowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    label: {
      flexShrink: 1,
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      color: colors.textSecondary,
    },
    labelSelected: { color: colors.accent },
    you: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.accent,
    },
    status: {
      marginLeft: 'auto',
      fontFamily: fonts.sans,
      fontSize: 10,
      color: colors.textMuted,
    },
    infoBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    treeHint: {
      marginTop: 8,
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
  });
}
