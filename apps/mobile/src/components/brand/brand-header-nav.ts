/** Auth screens keep a centered hero mark — no left brand lockup. */
export const AUTH_ROUTES_WITHOUT_BRAND_HEADER = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
] as const;

export const HOME_TAB_HREF = '/(tabs)/home' as const;

export function shouldShowScreenBrandHeader(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split('?')[0] ?? '';
  return !AUTH_ROUTES_WITHOUT_BRAND_HEADER.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}
