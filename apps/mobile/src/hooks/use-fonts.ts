import { Platform } from 'react-native';

/**
 * Font loading hook.
 * On web, fonts load via the <link> tag in +html.tsx — expo-font is not needed.
 * On native, expo-font handles loading; for now we return true so the app
 * renders immediately with system-font fallbacks until a proper native build
 * bundles the .ttf assets.
 */
export function useAppFonts(): boolean {
  if (Platform.OS === 'web') return true;
  // TODO: wire up expo-font useFonts for native builds when .ttf assets are bundled.
  return true;
}
