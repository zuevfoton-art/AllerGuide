import { Text } from 'react-native';
import type { AllergyConfirmationSource } from '@allerguide/core';
import { AllergyConfirmationEditor } from '@/src/components/AllergyConfirmationEditor';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupAllergenConfirmationsStepProps {
  selectedAllergenIds: string[];
  confirmations: Record<string, AllergyConfirmationSource>;
  onConfirmationsChange: (confirmations: Record<string, AllergyConfirmationSource>) => void;
}

export function ProfileSetupAllergenConfirmationsStep({
  selectedAllergenIds,
  confirmations,
  onConfirmationsChange,
}: ProfileSetupAllergenConfirmationsStepProps) {
  const ui = useUiStyles();
  const { t } = useTranslation();

  return (
    <GlassCard style={{ gap: 10 }}>
      <Text style={ui.sectionLabel}>{t('profileSetup.allergenConfirmations.title')}</Text>
      <Text style={ui.docMeta}>{t('profileSetup.allergenConfirmations.hint')}</Text>
      <AllergyConfirmationEditor
        selected={selectedAllergenIds}
        confirmations={confirmations}
        onChange={onConfirmationsChange}
      />
    </GlassCard>
  );
}
