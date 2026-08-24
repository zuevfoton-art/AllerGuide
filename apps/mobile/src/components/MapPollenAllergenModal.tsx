import { useEffect, useMemo, useState } from 'react';
import {
  POLLEN_TYPE_GROUP_BY_TAXON,
  type PollenMapTaxonId,
  type PollenPlantDetail,
  type PollenTierLevel,
  type PollenTypeGroup,
  type PollenUpiSnapshot,
} from '@allerguide/core';
import { ListPickerSheet, type ListPickerGroup } from '@/src/components/ListPickerSheet';
import { PollenPlantSheet } from '@/src/components/PollenPlantSheet';
import { useTheme } from '@/src/hooks/use-theme';
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
  const { t } = useTranslation();
  const [infoTaxonId, setInfoTaxonId] = useState<PollenMapTaxonId | null>(null);

  useEffect(() => {
    if (!visible) setInfoTaxonId(null);
  }, [visible]);

  const groups = useMemo<ListPickerGroup[]>(
    () =>
      TYPE_GROUP_ORDER.map((group) => ({
        title: `${t(POLLEN_TYPE_LABEL_KEYS[group] as 'map.pollenTypeTree')}`,
        testID: `map-allergen-group-${group.toLowerCase()}`,
        items: items
          .filter((item) => POLLEN_TYPE_GROUP_BY_TAXON[item.taxonId] === group)
          .map((item) => ({
            value: item.taxonId,
            label: labelForTaxon(item.taxonId),
            hint: item.profileRelevant ? t('map.pollenYou') : undefined,
            status:
              item.dataStatus === 'live'
                ? t('map.dataStatusLive')
                : item.dataStatus === 'google-only'
                  ? t('map.dataStatusGoogleOnly')
                  : t('map.dataStatusNone'),
            dot: levelColor(item.level, theme.colors),
            testID: `map-allergen-option-${item.taxonId}`,
            accessoryA11y: t('map.allergenInfoA11y', {
              taxon: labelForTaxon(item.taxonId),
            }),
            accessoryTestID: `map-allergen-info-${item.taxonId}`,
          })),
      })).filter((section) => section.items.length > 0),
    [items, labelForTaxon, t, theme.colors],
  );

  return (
    <ListPickerSheet
      visible={visible}
      title={infoTaxonId ? labelForTaxon(infoTaxonId) : t('map.allergenPickerTitle')}
      groups={groups}
      selected={[selectedTaxonId]}
      footnote={t('map.pollenTreeSpeciesLevelsHint')}
      footnoteTestID="map-tree-species-levels-hint"
      testID="map-pollen-allergen-modal"
      headerLeftLabel={infoTaxonId ? t('map.allergenPickerBack') : undefined}
      onHeaderLeft={infoTaxonId ? () => setInfoTaxonId(null) : undefined}
      detail={
        infoTaxonId ? (
          <PollenPlantSheet
            detail={plants[infoTaxonId] ?? null}
            upi={upiByTaxon?.[infoTaxonId] ?? null}
          />
        ) : undefined
      }
      onToggle={(value) => {
        onSelect(value as PollenMapTaxonId);
        onClose();
      }}
      onDone={onClose}
      onRequestClose={() => {
        if (infoTaxonId) {
          setInfoTaxonId(null);
          return;
        }
        onClose();
      }}
      onAccessory={(value) => setInfoTaxonId(value as PollenMapTaxonId)}
    />
  );
}

function levelColor(
  level: PollenTierLevel | null | undefined,
  colors: { danger: string; warning: string; success: string; textMuted: string },
): string {
  if (level === 'high') return colors.danger;
  if (level === 'mid') return colors.warning;
  if (level === 'low') return colors.success;
  return colors.textMuted;
}
