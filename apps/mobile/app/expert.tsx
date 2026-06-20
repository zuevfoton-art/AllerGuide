import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  EXPERT_ARTICLES,
  EXPERT_CATEGORIES,
  EXPERT_DISCLAIMER,
  EXPERT_HERO,
  getExpertArticlesByCategory,
  type ExpertArticleCategory,
} from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export default function ExpertScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [category, setCategory] = useState<ExpertArticleCategory>('recommendations');
  const [articleId, setArticleId] = useState<string | null>(null);

  const articles = getExpertArticlesByCategory(category);
  const article = EXPERT_ARTICLES.find((a) => a.id === articleId) ?? null;

  if (article) {
    return (
      <Screen>
        <Pressable style={styles.backBtn} onPress={() => setArticleId(null)}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.accent} />
          <Text style={styles.backText}>Назад</Text>
        </Pressable>
        <Text style={styles.articleTitle}>{article.title}</Text>
        <Text style={styles.articleBody}>{article.body}</Text>
        <Text style={styles.disclaimer}>{EXPERT_DISCLAIMER}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.accent} />
        <Text style={styles.backText}>Главная</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="school" size={28} color={theme.colors.onAccent} />
        </View>
        <Text style={styles.heroTitle}>Эксперт</Text>
        <Text style={styles.heroName}>{EXPERT_HERO.name}</Text>
        <Text style={styles.heroRole}>{EXPERT_HERO.role}</Text>
        <Text style={styles.heroSubtitle}>{EXPERT_HERO.subtitle}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {EXPERT_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[styles.tab, category === cat.id && styles.tabActive]}
            onPress={() => setCategory(cat.id)}>
            <Text style={[styles.tabText, category === cat.id && styles.tabTextActive]}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {articles.map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={() => setArticleId(item.id)}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSummary}>{item.summary}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
        </Pressable>
      ))}

      <Text style={styles.disclaimer}>{EXPERT_DISCLAIMER}</Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    backText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
    hero: {
      backgroundColor: colors.accentLight,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.accentMid,
      alignItems: 'center',
      gap: 4,
      marginBottom: 12,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      ...(shadows.accent as object),
    },
    heroTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
    heroName: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center' },
    heroRole: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
    heroSubtitle: { fontSize: 12, color: colors.accent, fontWeight: '600', marginTop: 4 },
    tabs: { gap: 8, paddingBottom: 8 },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    tabActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    tabTextActive: { color: colors.accent },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      gap: 6,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    cardSummary: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    articleTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
    articleBody: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginTop: 12 },
  });
}
