/**
 * Where the floating Ask FAB is allowed (user choice 1A).
 * Hidden on SOS, auth, onboarding, lock-adjacent entry, and profile setup.
 */
const ASK_FAB_HIDDEN_PREFIXES = [
  '/sos',
  '/sos-edit',
  '/ask',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/onboarding-intro',
  '/profile-setup',
] as const;

export function shouldShowAskFab(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split('?')[0] || pathname;
  if (path === '/' || path === '') return false;
  return !ASK_FAB_HIDDEN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
