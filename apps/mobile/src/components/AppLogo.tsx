import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { BrandMark } from '@/src/components/brand/BrandMark';
import { useTheme } from '@/src/hooks/use-theme';

/** @deprecated Prefer BrandMark from @/src/components/brand */
export function AppLogoMark({ size = 64 }: { size?: number }) {
  const theme = useTheme();
  return (
    <BrandMark size={size} accent={theme.colors.accent} color={theme.colors.onAccent} />
  );
}

/** @deprecated Prefer BrandLogo from @/src/components/brand */
export function AppLogoFull({ size = 32 }: { size?: number }) {
  return <BrandLogo size={Math.round(size * 1.4)} showWordmark />;
}
