import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { EXPERT_CATEGORIES, getExpertArticlesByCategory, MEDICAL_ADVISORY_BOARD, type ExpertArticleCategory } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandMark } from '@/src/components/brand/BrandMark';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export default function ExpertScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t, content } = useTranslation();
  const localeContent = content();
  const [category, setCategory] = useState<ExpertArticleCategory>('recommendations');
  const [articleId, setArticleId] = useState<string | null>(null);

  const articles = getExpertArticlesByCategory(category);
  const article = articleId ? localeContent.expertArticles[articleId] : null;

  if (article) {
    return (
      <Screen>
        <ScreenHeader
          onBack={() => setArticleId(null)}
          eyebrow={t('expert.eyebrow')}
          title={article.title}
        />
        <Text style={styles.articleBody}>{article.body}</Text>
        <Disclaimer showMdrFootnote>{localeContent.expertDisclaimer}</Disclaimer>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        onBack={() => router.back()}
        eyebrow={t('expert.eyebrow')}
        title={t('expert.title')}
        subtitle={`${localeContent.expertHero.name} · ${localeContent.expertHero.role}`}
      />

      <GlassCard variant="soft" style={styles.hero}>
        <View style={styles.heroIcon}>
          <BrandMark size={48} variant="mono" color={theme.colors.onAccent} />
        </View>
        <Text style={styles.heroSubtitle}>{localeContent.expertHero.subtitle}</Text>
      </GlassCard>

      <GlassCard variant="soft" style={styles.advisoryCard}>
        <Text style={styles.advisoryTitle}>{t('expert.advisoryTitle')}</Text>
        <Text style={styles.advisoryMeta}>{t('expert.advisorySubtitle')}</Text>
        {MEDICAL_ADVISORY_BOARD.map((member) => (
          <View key={member.id} style={styles.advisoryRow}>
            <Text style={styles.advisoryName}>{member.name}</Text>
            <Text style={styles.advisoryRole}>
              {member.role} · {member.affiliation}
            </Text>
          </View>
        ))}
      </GlassCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.pillRow}>
        {EXPERT_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[
              ui.pill,
              category === cat.id && {
                borderColor: theme.colors.accent,
                backgroundColor: theme.colors.accentLight,
              },
            ]}
            onPress={() => setCategory(cat.id)}>
            <Text
              style={[
                ui.pillText,
                category === cat.id && { color: theme.colors.accent },
              ]}>
              {localeContent.expertCategories[cat.id]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {articles.map((item) => {
        const localized = localeContent.expertArticles[item.id] ?? item;
        return (
          <Pressable key={item.id} onPress={() => setArticleId(item.id)}>
            <GlassCard style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{localized.title}</Text>
                <Text style={styles.cardSummary}>{localized.summary}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </GlassCard>
          </Pressable>
        );
      })}

      <Disclaimer showMdrFootnote>{localeContent.expertDisclaimer}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    hero: { alignItems: 'center', gap: 8 },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 6,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroSubtitle: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    advisoryCard: { gap: 8, marginBottom: 12 },
    advisoryTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    advisoryMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    advisoryRow: { gap: 2, paddingTop: 4 },
    advisoryName: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    advisoryRole: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 0,
    },
    cardBody: { flex: 1, gap: 4 },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    cardSummary: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    articleBody: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
  });
}
