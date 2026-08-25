import { useEffect, useRef, useState } from 'react';
import {
  DISH_SUGGESTION_MIN_QUERY,
  rankLocalDishSuggestions,
  type DishSuggestion,
} from '@allerguide/core';
import { searchDishSuggestions } from '@/src/services/dish-suggest-service';

const SEARCH_DEBOUNCE_MS = 250;

export function useDishSuggestions(
  query: string,
  options: { enabled?: boolean } = {},
): { suggestions: DishSuggestion[]; searching: boolean } {
  const enabled = options.enabled ?? true;
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled || query.trim().length < DISH_SUGGESTION_MIN_QUERY) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSuggestions(rankLocalDishSuggestions(query));

    const nextRequestId = requestId.current + 1;
    requestId.current = nextRequestId;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      void searchDishSuggestions(query)
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
  }, [enabled, query]);

  return { suggestions, searching };
}
