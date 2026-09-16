import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ASK_SUGGESTION_IDS, type AskMessage, type AskSuggestionId } from '@allerguide/core';
import { ActionChip } from '@/src/components/ActionChip';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { VoiceNoteButton } from '@/src/components/VoiceNoteButton';
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
  trackAskVoiceCompleted,
  trackAskVoiceStarted,
  type AskOpenSource,
} from '@/src/services/ask-chat-service';
import {
  isVoiceInputSupported,
  mergeVoiceIntoField,
  resolveVoiceDictationMode,
} from '@/src/services/voice-dictation-service';

export type UseAskChatOptions = {
  context?: string[];
  quickQuestions?: string[];
  openSource?: AskOpenSource;
  onHandoffSos?: () => void;
  testID?: string;
};

export type AskChatParts = {
  body: ReactNode;
  composer: ReactNode;
};

export function useAskChat({
  context,
  quickQuestions = [],
  openSource = 'route',
  onHandoffSos,
  testID = 'ask-panel',
}: UseAskChatOptions = {}): AskChatParts {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<AskMessage[]>(() => loadAskHistory());
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const voiceSupported = isVoiceInputSupported();

  useEffect(() => {
    trackAskOpened(openSource);
  }, [openSource]);

  const goSos = useCallback(() => {
    onHandoffSos?.();
    router.push('/(tabs)/sos');
  }, [onHandoffSos]);

  const send = useCallback(
    async (raw: string) => {
      if (busy) return;
      setBusy(true);
      try {
        const result = await sendAskQuestion({
          raw,
          locale,
          context,
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
          goSos();
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, context, goSos, locale, messages, t],
  );

  const onVoiceTranscript = useCallback((transcript: string) => {
    const mode = resolveVoiceDictationMode();
    if (mode === 'os') trackAskVoiceStarted('os');
    else if (mode === 'cloud-mic') trackAskVoiceStarted('cloud_mic');
    trackAskVoiceCompleted();
    setDraft((prev) => mergeVoiceIntoField(prev, transcript));
  }, []);

  const composer = (
    <View style={styles.composer} testID={`${testID}-composer`}>
      <View style={styles.chipRow}>
        {quickQuestions.map((question, index) => (
          <ActionChip
            key={`quick-${index}`}
            testID={`ask-quick-${index}`}
            label={question}
            disabled={busy}
            onPress={() => void send(question)}
          />
        ))}
        {ASK_SUGGESTION_IDS.map((id: AskSuggestionId) => (
          <ActionChip
            key={id}
            testID={`ask-suggest-${id}`}
            label={t(`ask.suggestions.${id}`)}
            disabled={busy}
            onPress={() => void send(t(`ask.suggestions.${id}`))}
          />
        ))}
      </View>
      <View style={styles.ovalRow}>
        {voiceSupported ? (
          <VoiceNoteButton
            testID="ask-voice"
            variant="icon"
            disabled={busy}
            onTranscript={onVoiceTranscript}
          />
        ) : null}
        <TextInput
          testID="ask-input"
          value={draft}
          onChangeText={setDraft}
          placeholder={t('ask.inputPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.ovalInput}
          editable={!busy}
          multiline
          maxLength={500}
          accessibilityLabel={t('ask.inputPlaceholder')}
        />
        <Pressable
          testID="ask-send"
          accessibilityRole="button"
          accessibilityLabel={t('ask.send')}
          disabled={busy || !draft.trim()}
          onPress={() => void send(draft)}
          style={[
            styles.sendBtn,
            (busy || !draft.trim()) && styles.sendBtnDisabled,
          ]}>
          <Ionicons
            name="send"
            size={18}
            color={
              busy || !draft.trim() ? theme.colors.textMuted : theme.colors.onAccent
            }
          />
        </Pressable>
      </View>
      {!AI_CHAT_ENABLED ? (
        <Text style={styles.flagHint} testID="ask-offline-mode-hint">
          {t('ask.disabledHint')}
        </Text>
      ) : null}
    </View>
  );

  const body = (
    <View style={styles.bodyWrap} testID={testID}>
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

      {messages.length === 0 ? <Text style={styles.body}>{t('ask.intro')}</Text> : null}

      {messages.map((message) =>
        message.handoff ? (
          <GlassCard key={message.id} testID="ask-handoff" zone="alarm">
            <CardTitle>{t('ask.handoffTitle')}</CardTitle>
            <Text style={styles.body}>{t('ask.handoffBody')}</Text>
            <Button label={t('ask.handoffAction')} variant="danger" block onPress={goSos} />
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
    </View>
  );

  return { body, composer };
}

/** Embedded Ask (scroll + composer) for bottom sheets. */
export function AskChatPanel(props: UseAskChatOptions) {
  const { body, composer } = useAskChat(props);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.embedded}>
      <ScrollView
        style={styles.embeddedScroll}
        contentContainerStyle={styles.embeddedScrollContent}
        keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
      <View style={styles.embeddedFooter}>{composer}</View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    embedded: { flex: 1, minHeight: 0 },
    embeddedScroll: { flex: 1 },
    embeddedScrollContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
    embeddedFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 4,
    },
    bodyWrap: { gap: 10 },
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
      borderRadius: radii.lg,
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
    ovalRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      minHeight: density.tapMinHeight + 4,
      maxHeight: 104,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingLeft: 6,
      paddingRight: 6,
      paddingVertical: 4,
      width: '100%',
    },
    ovalInput: {
      flex: 1,
      minHeight: density.tapMinHeight - 4,
      maxHeight: 88,
      paddingHorizontal: 8,
      paddingVertical: 10,
      fontFamily: fonts.sans,
      fontSize: WEB_INPUT_FONT_SIZE,
      color: colors.text,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      marginBottom: 2,
    },
    sendBtnDisabled: {
      backgroundColor: colors.border,
    },
    flagHint: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.textMuted,
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
