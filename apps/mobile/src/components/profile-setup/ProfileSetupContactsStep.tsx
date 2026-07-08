import { Text } from 'react-native';
import type { EmergencyContactDraft } from '@/src/services/emergency-contact-service';
import { EmergencyContactsEditor } from '@/src/components/EmergencyContactsEditor';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupContactsStepProps {
  contacts: EmergencyContactDraft[];
  onChange: (contacts: EmergencyContactDraft[]) => void;
}

export function ProfileSetupContactsStep({ contacts, onChange }: ProfileSetupContactsStepProps) {
  const ui = useUiStyles();
  const { t } = useTranslation();

  return (
    <GlassCard style={{ gap: 8 }}>
      <Text style={ui.sectionLabel}>{t('profileSetup.contactsLabel')}</Text>
      <EmergencyContactsEditor contacts={contacts} onChange={onChange} />
    </GlassCard>
  );
}
