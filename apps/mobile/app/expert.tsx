import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { EXPERT_CATEGORIES, getExpertArticlesByCategory, type ExpertArticleCategory } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { useGlassStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export default function ExpertScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const glass = useGlassStyles();
  const { t, content } = useTranslation();
  const localeContent = content();
  const [category, setCategory] = useState<ExpertArticleCategory>('recommendations');
  const [articleId, setArticleId] = useState<string | null>(null);

  const articles = getExpertArticlesByCategory(category);
  const article = articleId ? localeContent.expertArticles[articleId] : null;

  if (article) {
    return (
      <Screen>
        <Pressable style={styles.backBtn} onPress={() => setArticleId(null)}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.teal} />
          <Text style={styles.backText}>{t('expert.back')}</Text>
        </Pressable>
        <Text style={styles.articleTitle}>{article.title}</Text>
        <Text style={styles.articleBody}>{article.body}</Text>
        <Text style={glass.disclaimer}>{localeContent.expertDisclaimer}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.teal} />
        <Text style={styles.backText}>{t('expert.home')}</Text>
      </Pressable>

      <ScreenHeader
        title={t('expert.title')}
        subtitle={`${localeContent.expertHero.name} · ${localeContent.expertHero.role}`}
      />

      <GlassCard style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="school" size={28} color={theme.colors.onAccent} />
        </View>
        <Text style={styles.heroSubtitle}>{localeContent.expertHero.subtitle}</Text>
      </GlassCard>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={glass.pillRow}>
        {EXPERT_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[
              glass.pill,
              category === cat.id && { borderColor: theme.colors.teal, backgroundColor: theme.colors.tealLight },
            ]}
            onPress={() => setCategory(cat.id)}>
            <Text style={[glass.pillText, category === cat.id && { color: theme.colors.teal }]}>
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
              <Text style={styles.cardTitle}>{localized.title}</Text>
              <Text style={styles.cardSummary}>{localized.summary}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </GlassCard>
          </Pressable>
        );
      })}

      <Text style={glass.disclaimer}>{localeContent.expertDisclaimer}</Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    backText: { color: colors.teal, fontWeight: '600', fontSize: 15 },
    hero: { alignItems: 'center', gap: 8 },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
      ...(shadows.glass as object),
    },
    heroSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
    card: { gap: 6, marginBottom: 0 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    cardSummary: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    articleTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
    articleBody: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  });
}
