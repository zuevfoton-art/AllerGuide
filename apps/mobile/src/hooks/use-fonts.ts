import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import {
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
  useFonts as useSerifFonts,
} from '@expo-google-fonts/source-serif-4';

export function useAppFonts(): boolean {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [serifLoaded] = useSerifFonts({
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });
  return interLoaded && serifLoaded;
}
