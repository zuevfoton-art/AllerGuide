import { useMemo } from 'react';
import type { AllergyConditionId, ComorbidityLink, ProfileType } from '@allerguide/core';
import type { ConditionHistoryDrafts } from '@/src/components/ConditionHistoryEditor';
import { ClinicalPhenotypeCard } from '@/src/components/ClinicalPhenotypeCard';

interface ProfileSetupPhenotypeStepProps {
  conditions: AllergyConditionId[];
  conditionHistoryDrafts: ConditionHistoryDrafts;
  comorbidityLinks: ComorbidityLink[];
  allergenIds: string[];
  profileType: ProfileType;
  birthYear: string;
}

export function ProfileSetupPhenotypeStep({
  conditions,
  conditionHistoryDrafts,
  comorbidityLinks,
  allergenIds,
  profileType,
  birthYear,
}: ProfileSetupPhenotypeStepProps) {
  const parsedBirthYear = useMemo(() => {
    const year = Number(birthYear);
    return Number.isFinite(year) ? year : undefined;
  }, [birthYear]);

  return (
    <ClinicalPhenotypeCard
      conditionIds={conditions}
      conditionHistoryDrafts={conditionHistoryDrafts}
      comorbidityLinks={comorbidityLinks}
      allergenIds={allergenIds}
      profileType={profileType}
      birthYear={parsedBirthYear}
    />
  );
}
