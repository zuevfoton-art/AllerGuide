import { useEffect, useRef, useState } from 'react';
import { MEDICINE_SUGGESTION_MIN_QUERY, type MedicineCard } from '@allerguide/core';
import {
  rankLocalMedicineSuggestions,
  searchMedicineSuggestions,
} from '@/src/services/medicine-suggest-service';

const SEARCH_DEBOUNCE_MS = 250;
const EMPTY_CARDS: MedicineCard[] = [];

/**
 * Instant local suggestions, then a debounced catalog merge.
 * Used by the diary medicine / ASIT / therapy name steps and SOS intolerances.
 */
export function useMedicineSuggestions(
  query: string,
  options: {
    enabled?: boolean;
    profileId?: number | null;
    localCards?: MedicineCard[];
  } = {},
): { suggestions: MedicineCard[]; searching: boolean } {
  const enabled = options.enabled ?? true;
  const profileId = options.profileId ?? null;
  const localCards = options.localCards ?? EMPTY_CARDS;
  const [suggestions, setSuggestions] = useState<MedicineCard[]>([]);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled || query.trim().length < MEDICINE_SUGGESTION_MIN_QUERY) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSuggestions(rankLocalMedicineSuggestions(query, localCards));

    const nextRequestId = requestId.current + 1;
    requestId.current = nextRequestId;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      void searchMedicineSuggestions(query, profileId, localCards)
        .then((hits) => {
          if (cancelled || requestId.current !== nextRequestId) return;
          setSuggestions(hits);
        })
        .finally(() => {
          if (!cancelled && requestId.current === nextRequestId) {
            setSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, localCards, profileId, query]);

  return { suggestions, searching };
}
