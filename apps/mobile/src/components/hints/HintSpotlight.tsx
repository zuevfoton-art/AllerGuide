import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button } from '@/src/components/Button';
import { CardTitle } from '@/src/components/CardTitle';
import {
  HINT_ANCHOR_WAIT_MS,
  HINT_HOLE_PADDING,
  HINT_SCRIM_OPACITY,
  expandRect,
  firstResolvedHintStepIndex,
  isUsableAnchorRect,
  placeHintBubble,
  scrimRectsAroundHole,
  toLocalRect,
} from '@/src/components/hints/hint-geometry';
import { density, radii, space } from '@/src/constants/layout';
import { scaledTextProps } from '@/src/constants/typography';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useReduceMotion } from '@/src/hooks/use-reduce-motion';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { useTheme } from '@/src/hooks/use-theme';
import { getCurrentUserId } from '@/src/services/auth-service';
import { completeHintTour, dismissAllHintTours } from '@/src/services/first-run-hints-service';
import { useTranslation } from '@/src/store/locale-store';
import { useHintsStore } from '@/src/store/hints-store';

export function HintSpotlight() {
  const theme = useTheme();
  const ui = useUiStyles();
  const layout = useResponsiveLayout();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const styles = useMemo(() => createStyles(theme), [theme]);
  void reduceMotion;

  const activeTour = useHintsStore((state) => state.activeTour);
  const anchors = useHintsStore((state) => state.anchors);
  const goToNextStep = useHintsStore((state) => state.goToNextStep);
  const closeTour = useHintsStore((state) => state.closeTour);

  const windowSize = useWindowDimensions();
  const overlayRef = useRef<View>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [bubbleHeight, setBubbleHeight] = useState(180);
  const overlaySize =
    viewport.width > 0 ? viewport : { width: windowSize.width, height: windowSize.height };

  const step = activeTour?.steps[activeTour.stepIndex];
  const rawAnchor = step ? anchors[step.anchorId] : undefined;
  const holeWindow = isUsableAnchorRect(rawAnchor) ? expandRect(rawAnchor, HINT_HOLE_PADDING) : null;
  const hole = holeWindow ? toLocalRect(holeWindow, origin) : null;

  const finishTour = useCallback(
    (mode: 'complete' | 'dismiss') => {
      const tour = useHintsStore.getState().activeTour;
      const userId = getCurrentUserId();
      if (tour && userId) {
        if (mode === 'complete') {
          completeHintTour(userId, tour.tourId, tour.steps.length);
        } else {
          dismissAllHintTours(userId, {
            tourId: tour.tourId,
            stepIndex: tour.stepIndex,
            stepId: tour.steps[tour.stepIndex]?.id,
            stepsTotal: tour.steps.length,
          });
        }
      }
      closeTour();
    },
    [closeTour],
  );

  const advanceOrFinish = useCallback(() => {
    const tour = useHintsStore.getState().activeTour;
    if (!tour) return;
    if (tour.stepIndex >= tour.steps.length - 1) {
      finishTour('complete');
      return;
    }
    goToNextStep();
  }, [finishTour, goToNextStep]);

  useEffect(() => {
    if (!activeTour) return;

    const resolved = firstResolvedHintStepIndex(
      activeTour.steps,
      activeTour.stepIndex,
      anchors,
    );
    if (resolved === activeTour.stepIndex) return;

    const waitMs = resolved == null ? HINT_ANCHOR_WAIT_MS : 0;
    const timeout = setTimeout(() => {
      const latest = useHintsStore.getState().activeTour;
      if (!latest || latest.tourId !== activeTour.tourId) return;
      const nextIndex = firstResolvedHintStepIndex(
        latest.steps,
        latest.stepIndex,
        useHintsStore.getState().anchors,
      );
      if (nextIndex == null) {
        closeTour();
        return;
      }
      if (nextIndex !== latest.stepIndex) {
        useHintsStore.setState({ activeTour: { ...latest, stepIndex: nextIndex } });
      }
    }, waitMs);

    return () => clearTimeout(timeout);
  }, [activeTour, anchors, closeTour]);

  useEffect(() => {
    if (!activeTour || Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      finishTour('dismiss');
      return true;
    });
    return () => subscription.remove();
  }, [activeTour, finishTour]);

  if (!activeTour || !step || !hole) return null;

  const pieces = scrimRectsAroundHole(hole, overlaySize);
  const bubble = placeHintBubble({
    hole,
    viewport: overlaySize,
    bubbleHeight,
    horizontalPadding: layout.horizontalPadding,
    contentMaxWidth: typeof layout.contentMaxWidth === 'number' ? layout.contentMaxWidth : undefined,
  });
  const isLastStep = activeTour.stepIndex >= activeTour.steps.length - 1;
  const stepLabel = t('hints.step', {
    current: activeTour.stepIndex + 1,
    total: activeTour.steps.length,
  });
  const nextLabel = isLastStep ? t('hints.done') : t('hints.next');
  const nextA11y = `${nextLabel}, ${stepLabel}`;

  return (
    <View
      ref={overlayRef}
      testID="hint-overlay"
      accessibilityViewIsModal
      style={styles.root}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport({ width, height });
        overlayRef.current?.measureInWindow((x, y) => setOrigin({ x, y }));
      }}>
      {pieces.map((piece) => (
        <Pressable
          key={piece.key}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={advanceOrFinish}
          style={[
            styles.scrim,
            {
              left: piece.x,
              top: piece.y,
              width: piece.width,
              height: piece.height,
            },
          ]}
        />
      ))}

      <Pressable
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onPress={advanceOrFinish}
        style={[
          styles.holeHit,
          {
            left: hole.x,
            top: hole.y,
            width: hole.width,
            height: hole.height,
            borderRadius: radii.md,
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.holeRing,
          {
            left: hole.x,
            top: hole.y,
            width: hole.width,
            height: hole.height,
          },
        ]}
      />

      <View
        testID={`hint-step-${activeTour.tourId}-${step.id}`}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        onLayout={(event) => setBubbleHeight(event.nativeEvent.layout.height)}
        style={[
          styles.bubble,
          theme.shadows.md,
          {
            top: bubble.top,
            left: bubble.left,
            width: bubble.width,
          },
        ]}>
        <Text {...scaledTextProps} style={ui.sectionLabel}>
          {stepLabel}
        </Text>
        <CardTitle>{step.title}</CardTitle>
        <Text {...scaledTextProps} style={ui.feedSub}>
          {step.body}
        </Text>
        <View style={styles.actions}>
          <Button
            testID="hint-skip"
            label={t('hints.skip')}
            variant="ghost"
            size="sm"
            onPress={() => finishTour('dismiss')}
            accessibilityLabel={t('hints.skip')}
          />
          <Button
            testID="hint-next"
            label={nextLabel}
            variant="primary"
            size="sm"
            onPress={advanceOrFinish}
            accessibilityLabel={nextA11y}
          />
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 50,
    },
    scrim: {
      position: 'absolute',
      backgroundColor: theme.colors.overlay,
      opacity: HINT_SCRIM_OPACITY,
    },
    holeHit: {
      position: 'absolute',
    },
    holeRing: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: theme.colors.accent,
      borderRadius: radii.md,
    },
    bubble: {
      position: 'absolute',
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: density.cardPadding,
      gap: space[2],
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: space[1],
      gap: space[2],
    },
  });
}
