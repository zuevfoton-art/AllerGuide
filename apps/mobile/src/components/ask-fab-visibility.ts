/**
 * Explicit allow-list for the floating Ask FAB (brandbook shell).
 * Tab roots + market / reports / expert / profile stack except setup.
 */
const ASK_FAB_ALLOWED_PREFIXES = [
  '/home',
  '/diary',
  '/scanner',
  '/map',
  '/profile',
  '/profiles',
  '/profile-edit',
  '/market',
  '/doctor-report',
  '/expert',
] as const;

const ASK_FAB_HIDDEN_PREFIXES = [
  '/profile-setup',
  '/sos',
  '/sos-edit',
  '/ask',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/onboarding-intro',
  '/lock',
  '/legal',
] as const;

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function shouldShowAskFab(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split('?')[0] || pathname;
  if (path === '/' || path === '') return false;
  if (ASK_FAB_HIDDEN_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) {
    return false;
  }
  return ASK_FAB_ALLOWED_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

/** Ask FAB is icon-only everywhere (label stays on accessibilityLabel only). */
export function shouldUseExtendedAskFab(_pathname: string | null | undefined): boolean {
  return false;
}
