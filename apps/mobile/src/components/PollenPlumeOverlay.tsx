import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  type AppStateStatus,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PollenUpiIndex } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { tickPollenPlume, type PlumeParticle } from '@/src/services/pollen-plume-service';
import type { WindSnapshot } from '@/src/services/wind-service';

const FRAME_MS = 50;

type PollenPlumeOverlayProps = {
  upiIndex: PollenUpiIndex;
  wind: WindSnapshot | null;
  /** Honest label: plume follows TREE/GRASS/WEED group, not a single species. */
  groupHint: string;
};

export function PollenPlumeOverlay({ upiIndex, wind, groupHint }: PollenPlumeOverlayProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [particles, setParticles] = useState<PlumeParticle[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const nextIdRef = useRef(1);
  const particlesRef = useRef<PlumeParticle[]>([]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => setActive(state === 'active');
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    particlesRef.current = [];
    nextIdRef.current = 1;
    setParticles([]);
  }, [upiIndex, wind?.directionDeg, wind?.speedMps]);

  useEffect(() => {
    if (reduceMotion || !active || upiIndex <= 0) {
      return undefined;
    }

    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const dtMs = Math.min(120, now - last);
      last = now;
      const tick = tickPollenPlume({
        particles: particlesRef.current,
        nextId: nextIdRef.current,
        dtMs,
        upiIndex,
        wind,
        nowMs: now,
      });
      particlesRef.current = tick.particles;
      nextIdRef.current = tick.nextId;
      setParticles(tick.particles);
    }, FRAME_MS);

    return () => clearInterval(timer);
  }, [active, reduceMotion, upiIndex, wind]);

  if (upiIndex <= 0) return null;

  return (
    <View style={styles.root} pointerEvents="none" testID="map-pollen-plume">
      {reduceMotion || !active ? (
        <View style={[styles.staticPulse, { opacity: 0.15 + upiIndex * 0.06 }]} />
      ) : (
        particles.map((particle) => (
          <View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: `${particle.x * 100}%`,
                top: `${particle.y * 100}%`,
                width: particle.size,
                height: particle.size,
                opacity: particle.opacity,
                marginLeft: -particle.size / 2,
                marginTop: -particle.size / 2,
                backgroundColor: theme.colors.accent,
              },
            ]}
          />
        ))
      )}
      <View style={styles.caption}>
        <Text style={styles.captionText}>{t('map.plumeHint', { group: groupHint })}</Text>
      </View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    particle: {
      position: 'absolute',
      borderRadius: 99,
    },
    staticPulse: {
      position: 'absolute',
      left: '30%',
      top: '30%',
      width: '40%',
      height: '40%',
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    caption: {
      position: 'absolute',
      left: 8,
      bottom: 8,
      maxWidth: '70%',
      borderRadius: 6,
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    captionText: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: '#fff',
      lineHeight: 13,
    },
  });
}
