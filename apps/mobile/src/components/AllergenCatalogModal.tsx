import { useMemo, useState, useEffect } from 'react';
import {
  getAllAllergens,
  getCrossReactionsFor,
  type AllergenCategory,
  type AllergenRecord,
} from '@allerguide/core';
import { getAllergenCatalogSnapshot, resolveAllergenCatalog } from '@/src/services/allergen-catalog-service';
import { ListPickerSheet, type ListPickerGroup } from '@/src/components/ListPickerSheet';
import { useTranslation } from '@/src/store/locale-store';
import { localizeAllergenCategory } from '@/src/i18n/content';
import { formatCrossReactionLabel } from '@/src/i18n/cross-reactions';

const CATEGORY_ORDER: AllergenCategory[] = ['food', 'environmental', 'medication', 'insect'];

interface AllergenCatalogModalProps {
  visible: boolean;
  selected: string[];
  onClose: () => void;
  onApply: (selected: string[]) => void;
}

export function AllergenCatalogModal({
  visible,
  selected,
  onClose,
  onApply,
}: AllergenCatalogModalProps) {
  const { t, content } = useTranslation();
  const localeContent = content();
  const [draft, setDraft] = useState<string[]>(selected);
  const [catalog, setCatalog] = useState<AllergenRecord[]>(getAllergenCatalogSnapshot());

  useEffect(() => {
    if (!visible) return;
    setDraft(selected);
    void resolveAllergenCatalog().then((result) => setCatalog(result.allergens));
  }, [visible, selected]);

  const groups = useMemo<ListPickerGroup[]>(() => {
    const items = catalog.length > 0 ? catalog : getAllAllergens();
    return CATEGORY_ORDER.map((category) => ({
      title: localizeAllergenCategory(category, localeContent),
      items: items
        .filter((item) => item.category === category)
        .map((item) => {
          const crossReactions = getCrossReactionsFor(item.id);
          return {
            value: item.id,
            label: item.name,
            hint:
              crossReactions.length > 0
                ? `${t('allergens.crossReactions')}: ${crossReactions
                    .map((match) => formatCrossReactionLabel(match, t))
                    .join(', ')}`
                : undefined,
          };
        }),
    })).filter((group) => group.items.length > 0);
  }, [catalog, localeContent, t]);

  return (
    <ListPickerSheet
      visible={visible}
      title={t('allergens.catalogTitle')}
      groups={groups}
      selected={draft}
      multi
      fullHeight
      searchPlaceholder={t('allergens.searchPlaceholder')}
      onToggle={(value) => {
        setDraft((prev) =>
          prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
        );
      }}
      onDone={() => {
        onApply(draft);
        onClose();
      }}
      onRequestClose={onClose}
    />
  );
}
