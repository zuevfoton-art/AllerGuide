import {
  parseSymptomBaselineJson,
  serializeSymptomBaseline,
  type ProfileSymptomBaseline,
} from '@allerguide/core';
import { getSetting, setSetting } from '@/src/services/settings-service';

function baselineKey(profileId: number) {
  return `symptomBaseline:${profileId}`;
}

export function getStoredSymptomBaseline(profileId: number): ProfileSymptomBaseline | null {
  return parseSymptomBaselineJson(getSetting(baselineKey(profileId)));
}

export function setStoredSymptomBaseline(
  profileId: number,
  baseline: ProfileSymptomBaseline | null,
) {
  const serialized = serializeSymptomBaseline(baseline);
  if (!serialized) {
    setSetting(baselineKey(profileId), '');
    return;
  }
  setSetting(baselineKey(profileId), serialized);
}
