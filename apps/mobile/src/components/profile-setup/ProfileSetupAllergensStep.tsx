import type {
  AllergyConditionId,
  AllergyConfirmationSource,
} from '@allerguide/core';
import { normalizeAllergyConfirmations } from '@allerguide/core';
import { AllergenPicker } from '@/src/components/AllergenPicker';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Text } from 'react-native';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupAllergensStepProps {
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  confirmations: Record<string, AllergyConfirmationSource>;
  onConfirmationsChange: (value: Record<string, AllergyConfirmationSource>) => void;
  suggestedConditionIds?: AllergyConditionId[];
  onAddSuggestedCondition?: (id: AllergyConditionId) => void;
}

/**
 * Allergens-only step (P1): catalog pick + default self_reported confirmations.
 * Cross-reactions move to ProfileSetupCrossReactionsStep.
 */
export function ProfileSetupAllergensStep({
  selected,
  onSelectedChange,
  confirmations,
  onConfirmationsChange,
  suggestedConditionIds = [],
  onAddSuggestedCondition,
}: ProfileSetupAllergensStepProps) {
  const ui = useUiStyles();
  const { t } = useTranslation();

  return (
    <GlassCard style={{ gap: 8 }}>
      <Text style={ui.sectionLabel}>{t('profileSetup.allergensLabel')}</Text>
      <Text style={ui.docMeta}>{t('profileSetup.allergensHint')}</Text>
      <AllergenPicker
        selected={selected}
        showCrossReactions={false}
        suggestedConditionIds={suggestedConditionIds}
        onAddSuggestedCondition={onAddSuggestedCondition}
        onChange={(ids) => {
          onSelectedChange(ids);
          onConfirmationsChange(normalizeAllergyConfirmations(ids, confirmations));
        }}
      />
    </GlassCard>
  );
}
