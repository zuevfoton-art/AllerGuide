import type { AllergyConditionId, ProfileType } from '@allerguide/core';
import { ProfileConditionsSection } from '@/src/components/profile-setup/ProfileConditionsSection';

interface ProfileSetupConditionsStepProps {
  selected: AllergyConditionId[];
  onChange: (selected: AllergyConditionId[]) => void;
  profileType: ProfileType;
}

export function ProfileSetupConditionsStep(props: ProfileSetupConditionsStepProps) {
  return <ProfileConditionsSection {...props} />;
}
