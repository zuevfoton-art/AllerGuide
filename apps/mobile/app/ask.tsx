import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ASK_SUGGESTION_IDS, type AskMessage, type AskSuggestionId } from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { AI_CHAT_ENABLED } from '@/src/constants/features';
import { density, radii, WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { showStatusBanner } from '@/src/store/banner-store';
import {
  buildAskOfflineCards,
  loadAskHistory,
  saveAskHistory,
  sendAskQuestion,
  trackAskOpened,
} from '@/src/services/ask-chat-service';

/**
 * Second-line explainer chat (north-star §4.9). Not on Today as the hero, never
 * on SOS: distress wording hands the user to the crisis screen instead of the model.
 */
export default function AskScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<AskMessage[]>(() => loadAskHistory());
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  useEffect(() => {
    trackAskOpened();
  }, []);

  const send = async (raw: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await sendAskQuestion({
        raw,
        locale,
        history: messages,
        fallbackAnswer: t('ask.answerFallback'),
      });
      if (!result.ok) {
        if (result.reason === 'empty') return;
        showStatusBanner({ tone: 'error', message: t('common.error') });
        return;
      }

      const next = [...messages, result.question, result.reply];
      setMessages(next);
      saveAskHistory(next);
      setDraft('');
      setOffline(result.offline);

      if (result.handoff) {
        router.push('/(tabs)/sos');
      }
    } finally {
      setBusy(false);
    }
  };

  const composer = (
    <View style={styles.composer}>
      <View style={styles.chipRow}>
        {ASK_SUGGESTION_IDS.map((id: AskSuggestionId) => (
          <Pressable
            key={id}
            testID={`ask-suggest-${id}`}
            style={styles.chip}
            onPress={() => void send(t(`ask.suggestions.${id}`))}
            disabled={busy || !AI_CHAT_ENABLED}
            accessibilityRole="button"
            accessibilityLabel={t(`ask.suggestions.${id}`)}>
            <Text style={styles.chipText}>{t(`ask.suggestions.${id}`)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          testID="ask-input"
          value={draft}
          onChangeText={setDraft}
          placeholder={t('ask.inputPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          editable={AI_CHAT_ENABLED && !busy}
          multiline
          maxLength={500}
          accessibilityLabel={t('ask.inputPlaceholder')}
        />
        <Button
          testID="ask-send"
          label={t('ask.send')}
          variant="primary"
          size="sm"
          disabled={!AI_CHAT_ENABLED || busy || !draft.trim()}
          onPress={() => void send(draft)}
        />
      </View>
    </View>
  );

  return (
    <Screen pinnedBottom={composer}>
      <ScreenHeader
        onBack={() => router.back()}
        eyebrow={t('ask.eyebrow')}
        title={t('ask.title')}
      />

      <Pressable
        testID="ask-disclaimer-toggle"
        onPress={() => setDisclaimerOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: disclaimerOpen }}
        accessibilityLabel={disclaimerOpen ? t('ask.disclaimerHide') : t('ask.disclaimerShow')}>
        <Text style={styles.disclaimerToggle}>
          {disclaimerOpen ? t('ask.disclaimerHide') : t('ask.disclaimerShow')}
        </Text>
      </Pressable>
      {disclaimerOpen ? <Disclaimer collapsible={false}>{t('ask.disclaimer')}</Disclaimer> : null}

      {!AI_CHAT_ENABLED ? (
        <GlassCard testID="ask-disabled">
          <CardTitle>{t('ask.disabledTitle')}</CardTitle>
          <Text style={styles.body}>{t('ask.disabledHint')}</Text>
        </GlassCard>
      ) : null}

      {AI_CHAT_ENABLED && messages.length === 0 ? (
        <Text style={styles.body}>{t('ask.intro')}</Text>
      ) : null}

      {messages.map((message) =>
        message.handoff ? (
          <GlassCard key={message.id} testID="ask-handoff" zone="alarm">
            <CardTitle>{t('ask.handoffTitle')}</CardTitle>
            <Text style={styles.body}>{t('ask.handoffBody')}</Text>
            <Button
              label={t('ask.handoffAction')}
              variant="danger"
              block
              onPress={() => router.push('/(tabs)/sos')}
            />
          </GlassCard>
        ) : (
          <View
            key={message.id}
            testID={`ask-message-${message.role}`}
            style={[styles.bubble, message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text style={message.role === 'user' ? styles.bubbleUserText : styles.bubbleAssistantText}>
              {message.text}
            </Text>
          </View>
        ),
      )}

      {offline ? (
        <GlassCard testID="ask-offline">
          <CardTitle>{t('ask.offlineTitle')}</CardTitle>
          <Text style={styles.body}>{t('ask.offlineHint')}</Text>
          {buildAskOfflineCards().map((card) => (
            <Pressable
              key={card.articleId}
              style={styles.offlineRow}
              onPress={() => router.push(`/expert?article=${card.articleId}` as never)}
              accessibilityRole="button"
              accessibilityLabel={card.title}>
              <Text style={styles.offlineTitle}>{card.title}</Text>
              <Text style={styles.body}>{card.summary}</Text>
              <Text style={styles.offlineLink}>{t('ask.offlineExpert')}</Text>
            </Pressable>
          ))}
        </GlassCard>
      ) : null}
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    disclaimerToggle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      fontWeight: '600',
      color: colors.accent,
    },
    body: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: colors.textSecondary,
    },
    bubble: {
      borderRadius: radii.md,
      paddingVertical: 10,
      paddingHorizontal: 12,
      maxWidth: '92%',
    },
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accentMid,
    },
    bubbleAssistant: {
      alignSelf: 'flex-start',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleUserText: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: colors.head,
    },
    bubbleAssistantText: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: colors.text,
    },
    composer: { gap: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      minHeight: density.tapMinHeight,
      paddingHorizontal: 12,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      justifyContent: 'center',
    },
    chipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      fontWeight: '600',
      color: colors.text,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: density.tapMinHeight,
      maxHeight: 96,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.sans,
      fontSize: WEB_INPUT_FONT_SIZE,
      color: colors.text,
    },
    offlineRow: {
      gap: 4,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 10,
    },
    offlineTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      fontWeight: '600',
      color: colors.head,
    },
    offlineLink: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}
