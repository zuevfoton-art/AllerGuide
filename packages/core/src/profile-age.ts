const MIN_REASONABLE_AGE_YEARS = 0;
const MAX_REASONABLE_AGE_YEARS = 130;

/** Calendar-year age from a profile birth year. Returns null when the year is missing or implausible. */
export function getProfileAgeYears(
  birthYear: number | null | undefined,
  now: Date = new Date(),
): number | null {
  if (birthYear == null || !Number.isFinite(birthYear)) return null;
  const year = Math.trunc(birthYear);
  const age = now.getFullYear() - year;
  if (age < MIN_REASONABLE_AGE_YEARS || age > MAX_REASONABLE_AGE_YEARS) return null;
  return age;
}

export function isChildAgeYears(ageYears: number | null | undefined): boolean {
  return ageYears != null && ageYears < 18;
}
