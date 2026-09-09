import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { EXPERT_CATEGORIES, getExpertArticle, getExpertArticlesByCategory, MEDICAL_ADVISORY_BOARD, type ExpertArticleCategory } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { Disclaimer } from '@/src/components/Disclaimer';
import { BrandMark } from '@/src/components/brand/BrandMark';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

const COLON_SPLIT_IDS = new Set(['pollen-calendar-moscow', 'symptom-scale-rhinitis']);

const CATEGORY_IONICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  book: 'book-outline',
  calendar: 'calendar-outline',
  list: 'list-outline',
  medical: 'medkit-outline',
  alert: 'alert-circle-outline',
  stats: 'stats-chart-outline',
};

function splitColonLines(body: string): string[] | null {
  const chunks = body.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  if (chunks.length < 2) return null;
  if (!chunks.some((part) => part.includes(':'))) return null;
  return chunks;
}

export default function ExpertScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t, content } = useTranslation();
  const localeContent = content();
  const params = useLocalSearchParams<{ article?: string; category?: string }>();
  const articleId = typeof params.article === 'string' ? params.article : null;
  const category: ExpertArticleCategory =
    typeof params.category === 'string' &&
    EXPERT_CATEGORIES.some((item) => item.id === params.category)
      ? (params.category as ExpertArticleCategory)
      : 'recommendations';

  const articles = getExpertArticlesByCategory(category);
  const article = articleId ? localeContent.expertArticles[articleId] : null;
  const catalogArticle = articleId ? getExpertArticle(articleId) : undefined;

  if (article) {
    const lines =
      articleId && COLON_SPLIT_IDS.has(articleId) ? splitColonLines(article.body) : null;
    return (
      <Screen>
        <ScreenHeader
          onBack={() => router.back()}
          eyebrow={t('expert.eyebrow')}
          title={article.title}
        />
        {lines ? (
          <View style={styles.articleLines}>
            {lines.map((line) => (
              <Text key={line} style={styles.articleBody}>
                {line}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.articleBody}>{article.body}</Text>
        )}
        {catalogArticle?.tags?.length ? (
          <View style={ui.pillRow}>
            {catalogArticle.tags.map((tag) => (
              <View key={tag} style={ui.pill}>
                <Text style={ui.pillText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Disclaimer showMdrFootnote>{localeContent.expertDisclaimer}</Disclaimer>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        onBack={() => router.back()}
        title={t('expert.title')}
        subtitle={`${localeContent.expertHero.name} · ${localeContent.expertHero.role}`}
      />

      <GlassCard style={styles.hero}>
        <View style={styles.heroIcon}>
          <BrandMark size={48} variant="mono" color={theme.colors.onAccent} />
        </View>
        <Text style={styles.heroSubtitle}>{localeContent.expertHero.subtitle}</Text>
      </GlassCard>

      <GlassCard style={styles.advisoryCard}>
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
            onPress={() => router.setParams({ category: cat.id })}>
            <Ionicons
              name={CATEGORY_IONICONS[cat.icon] ?? 'book-outline'}
              size={14}
              color={category === cat.id ? theme.colors.accent : theme.colors.textSecondary}
            />
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
          <Pressable key={item.id} onPress={() => router.push(`/expert?article=${item.id}`)}>
            <GlassCard style={styles.card}>
              <View style={styles.cardBody}>
                <CardTitle>{localized.title}</CardTitle>
                <Text style={styles.cardSummary}>{localized.summary}</Text>
                {item.tags.length > 0 ? (
                  <View style={ui.pillRow}>
                    {item.tags.map((tag) => (
                      <View key={tag} style={ui.pill}>
                        <Text style={ui.pillText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
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
    cardSummary: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    articleLines: { gap: 10 },
    articleBody: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
  });
}
