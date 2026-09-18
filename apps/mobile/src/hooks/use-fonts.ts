import { Platform } from 'react-native';
import {
  useFonts,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from '@expo-google-fonts/work-sans';

/**
 * Font loading hook.
 * On web, fonts load via the <link> tag in +html.tsx — expo-font is not needed.
 * On native, `@expo-google-fonts/work-sans` registers the zip type family.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
  });
  if (Platform.OS === 'web') return true;
  return loaded;
}
