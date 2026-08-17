import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenBrandHeader } from '@/src/components/brand/ScreenBrandHeader';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import type { ReactNode } from 'react';

type ScreenBackBrandHeaderProps = {
  onBack?: () => void;
  right?: ReactNode;
};

/** Brand lockup with a back control in the left slot for stack screens. */
export function ScreenBackBrandHeader({ onBack, right }: ScreenBackBrandHeaderProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <ScreenBrandHeader
      left={
        <Pressable
          onPress={onBack ?? (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
      }
      right={right}
    />
  );
}
