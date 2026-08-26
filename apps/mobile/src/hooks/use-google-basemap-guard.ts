import { useCallback, useEffect, useRef, useState } from 'react';

/** Native MapView with a missing/restricted key stays beige and never fires onMapLoaded. */
export const GOOGLE_BASEMAP_LOAD_TIMEOUT_MS = 8000;

export function useGoogleBasemapGuard(enabled: boolean) {
  const [failed, setFailed] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || failed) {
      return undefined;
    }

    loadedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadedRef.current) {
        setFailed(true);
      }
    }, GOOGLE_BASEMAP_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [enabled, failed]);

  const onMapLoaded = useCallback(() => {
    loadedRef.current = true;
  }, []);

  return { failed, onMapLoaded };
}
