import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { clampPollenUpiIndex, type PollenUpiIndex, type PollenUpiSnapshot } from '@allerguide/core';
import type { GoogleMapCircle, GoogleMapPolyline } from '@/src/components/google-pollen-map.types';
import {
  interpolateMapUpi,
  plumeStreakForWind,
  tickPollenPlume,
  type PlumeParticle,
} from '@/src/services/pollen-plume-service';
import type { WindSnapshot } from '@/src/services/wind-service';

const FRAME_MS = 80;

type UsePollenPlumeParams = {
  enabled: boolean;
  originLatitude: number;
  originLongitude: number;
  todayUpi: PollenUpiSnapshot | null | undefined;
  tomorrowUpi: PollenUpiSnapshot | null | undefined;
  /** Optional near-real-time UPI from Open-Meteo hourly series (secondary). */
  hourlyUpi?: PollenUpiIndex | null;
  wind: WindSnapshot | null;
  accentColor: string;
};

export function usePollenPlume({
  enabled,
  originLatitude,
  originLongitude,
  todayUpi,
  tomorrowUpi,
  hourlyUpi,
  wind,
  accentColor,
}: UsePollenPlumeParams): {
  circles: GoogleMapCircle[];
  polylines: GoogleMapPolyline[];
  upiIndex: PollenUpiIndex;
  reduceMotion: boolean;
} {
  const upiIndex = useMemo(() => {
    if (typeof hourlyUpi === 'number') return clampPollenUpiIndex(hourlyUpi);
    return interpolateMapUpi(todayUpi, tomorrowUpi);
  }, [hourlyUpi, todayUpi, tomorrowUpi]);
  const [particles, setParticles] = useState<PlumeParticle[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const nextIdRef = useRef(1);
  const particlesRef = useRef<PlumeParticle[]>([]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
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
  }, [originLatitude, originLongitude, upiIndex, wind?.directionDeg, wind?.speedMps]);

  useEffect(() => {
    if (!enabled || reduceMotion || !active || upiIndex <= 0) {
      return undefined;
    }

    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const dtMs = Math.min(160, now - last);
      last = now;
      const tick = tickPollenPlume({
        particles: particlesRef.current,
        nextId: nextIdRef.current,
        dtMs,
        upiIndex,
        originLatitude,
        originLongitude,
        wind,
        nowMs: now,
      });
      particlesRef.current = tick.particles;
      nextIdRef.current = tick.nextId;
      setParticles(tick.particles);
    }, FRAME_MS);

    return () => clearInterval(timer);
  }, [
    active,
    enabled,
    originLatitude,
    originLongitude,
    reduceMotion,
    upiIndex,
    wind,
  ]);

  const polylines = useMemo((): GoogleMapPolyline[] => {
    if (!enabled || upiIndex <= 0) return [];
    const path = plumeStreakForWind({
      originLatitude,
      originLongitude,
      wind,
      upiIndex,
    });
    if (path.length < 2) return [];
    return [
      {
        id: 'plume-streak',
        path,
        color: accentColor,
        width: reduceMotion ? 4 : 3,
        opacity: reduceMotion ? 0.45 : 0.35,
      },
    ];
  }, [
    accentColor,
    enabled,
    originLatitude,
    originLongitude,
    reduceMotion,
    upiIndex,
    wind,
  ]);

  const circles = useMemo((): GoogleMapCircle[] => {
    if (!enabled || upiIndex <= 0) return [];
    if (reduceMotion || !active) {
      return [
        {
          id: 'plume-static',
          latitude: originLatitude,
          longitude: originLongitude,
          radiusM: 1200 + upiIndex * 400,
          color: accentColor,
          opacity: 0.12 + upiIndex * 0.03,
        },
      ];
    }
    return particles.map((particle) => ({
      id: `plume-${particle.id}`,
      latitude: particle.latitude,
      longitude: particle.longitude,
      radiusM: particle.radiusM,
      color: accentColor,
      opacity: particle.opacity,
    }));
  }, [
    accentColor,
    active,
    enabled,
    originLatitude,
    originLongitude,
    particles,
    reduceMotion,
    upiIndex,
  ]);

  return { circles, polylines, upiIndex, reduceMotion };
}
