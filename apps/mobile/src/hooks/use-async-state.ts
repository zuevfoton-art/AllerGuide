import { useCallback, useRef, useState } from 'react';

export type AsyncRunMode = 'initial' | 'refresh';

export type AsyncState<T> = {
  data: T | null;
  error: unknown;
  /** Initial / full-screen load (no data shown yet). */
  loading: boolean;
  /** Pull-to-refresh load (data already on screen). */
  refreshing: boolean;
  /** Run the loader as an initial load. */
  reload: () => Promise<void>;
  /** Run the loader as a pull-to-refresh. */
  refresh: () => Promise<void>;
  setData: (value: T | null) => void;
};

/**
 * Manages loading / refreshing / error state around an async loader.
 * The loader is read from a ref, so passing an inline closure does not
 * recreate `reload` / `refresh` and they stay stable for `useFocusEffect`.
 */
export function useAsyncState<T>(loader: () => Promise<T>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async (mode: AsyncRunMode) => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => run('initial'), [run]);
  const refresh = useCallback(() => run('refresh'), [run]);

  return { data, error, loading, refreshing, reload, refresh, setData };
}
