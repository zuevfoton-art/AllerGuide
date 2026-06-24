import { Text, View, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { MarketplaceModule } from '@/src/modules/marketplace';

export default function MarketScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={ui.docLabel}>AllerGuide · {t('market.eyebrow')}</Text>
        <Text style={ui.docTitle}>{t('market.title')}</Text>
        <Text style={ui.docMeta}>{t('market.subtitle')}</Text>
      </View>

      <ProfileSwitcher />

      <MarketplaceModule variant="full" />
    </Screen>
  );
}

function createStyles(_theme: AppTheme) {
  return StyleSheet.create({
    header: { gap: 2 },
  });
}
