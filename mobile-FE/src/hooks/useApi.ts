import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError } from '../api';

export interface QueryState<T> {
  data: T | undefined;
  error: ApiError | null;
  /** True on the first load only — use it to decide between skeleton vs spinner. */
  isLoading: boolean;
  /** True while a manual refresh or refetch is in flight. */
  isRefreshing: boolean;
  refetch: () => void;
}

interface QueryOptions {
  /** Skip the request entirely — e.g. while an id is still undefined. */
  enabled?: boolean;
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  return new ApiError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.', -1);
}

/**
 * Minimal fetch-on-mount hook. `deps` behaves like a useEffect dependency
 * array — the request re-runs whenever one of them changes.
 */
export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList = [],
  options: QueryOptions = {},
): QueryState<T> {
  const { enabled = true } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const hasLoadedRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (isRefresh: boolean) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const result = await fetcherRef.current(controller.signal);
        if (controller.signal.aborted) return;
        setData(result);
        setError(null);
        hasLoadedRef.current = true;
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(toApiError(err));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void run(hasLoadedRef.current);
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  const refetch = useCallback(() => {
    if (enabled) void run(hasLoadedRef.current);
  }, [enabled, run]);

  return { data, error, isLoading, isRefreshing, refetch };
}

/**
 * Refetch when a screen regains focus. Kept separate from `useApiQuery`
 * because it needs a navigation context, which providers mounted above the
 * screen tree do not have.
 */
export function useRefetchOnFocus(refetch: () => void, enabled = true) {
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      // The query already fetched on mount; skip the focus that follows it.
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      if (enabled) refetch();
    }, [refetch, enabled]),
  );
}

export interface MutationState<TArgs extends unknown[], TResult> {
  mutate: (...args: TArgs) => Promise<TResult | undefined>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
}

/** Fire-and-await wrapper for writes, with pending/error state for the UI. */
export function useApiMutation<TArgs extends unknown[], TResult>(
  mutator: (...args: TArgs) => Promise<TResult>,
): MutationState<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutatorRef = useRef(mutator);
  mutatorRef.current = mutator;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(async (...args: TArgs) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await mutatorRef.current(...args);
      return result;
    } catch (err) {
      if (mountedRef.current) setError(toApiError(err));
      return undefined;
    } finally {
      if (mountedRef.current) setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { mutate, isPending, error, reset };
}
