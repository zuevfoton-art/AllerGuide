import { Text, View, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { MarketplaceModule } from '@/src/modules/marketplace';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';

export default function MarketScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('market.eyebrow')} />
          <Text style={ui.docTitle}>{t('market.title')}</Text>
          <Text style={ui.docMeta}>{t('market.subtitle')}</Text>
        </View>
        <ProfileHeaderButton />
      </View>

      <ProfileSwitcher />

      <MarketplaceModule variant="full" />
    </Screen>
  );
}

function createStyles(_theme: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
  });
}
