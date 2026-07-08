import type { AllergyConfirmationSource } from '@allerguide/core';
import { normalizeAllergyConfirmations } from '@allerguide/core';
import { AllergenPicker } from '@/src/components/AllergenPicker';
import { AllergyConfirmationEditor } from '@/src/components/AllergyConfirmationEditor';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Text } from 'react-native';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupAllergensStepProps {
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  confirmations: Record<string, AllergyConfirmationSource>;
  onConfirmationsChange: (value: Record<string, AllergyConfirmationSource>) => void;
}

export function ProfileSetupAllergensStep({
  selected,
  onSelectedChange,
  confirmations,
  onConfirmationsChange,
}: ProfileSetupAllergensStepProps) {
  const ui = useUiStyles();
  const { t } = useTranslation();

  return (
    <GlassCard style={{ gap: 8 }}>
      <Text style={ui.sectionLabel}>{t('profileSetup.allergensLabel')}</Text>
      <AllergenPicker
        selected={selected}
        onChange={(ids) => {
          onSelectedChange(ids);
          onConfirmationsChange(normalizeAllergyConfirmations(ids, confirmations));
        }}
      />
      <AllergyConfirmationEditor
        selected={selected}
        confirmations={confirmations}
        onChange={onConfirmationsChange}
      />
    </GlassCard>
  );
}
