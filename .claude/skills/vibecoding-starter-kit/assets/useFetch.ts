'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * SWR-like client-side data fetching hook.
 *
 * Features:
 * - In-memory cache (LRU, max 100 entries)
 * - Request deduplication (concurrent calls share one fetch)
 * - Stale-while-revalidate (configurable staleTime)
 * - Optimistic mutations
 * - Manual refetch
 *
 * Use only in Client Components. For Server Component data fetching,
 * call Drizzle directly in the async component.
 */

const cache = new Map<string, { data: unknown; timestamp: number }>();
const pendingRequests = new Map<string, Promise<unknown>>();

const DEFAULT_STALE_TIME = 30_000; // 30 seconds
const MAX_CACHE_SIZE = 100;

function cleanCache() {
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );
    const toRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
    for (let i = 0; i < toRemove; i++) cache.delete(entries[i][0]);
  }
}

interface UseFetchOptions<T> {
  staleTime?: number;
  initialData?: T;
  skip?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseFetchResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data?: T | ((prev: T | null) => T)) => void;
  refetch: () => Promise<void>;
}

export function useFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseFetchOptions<T> = {},
): UseFetchResult<T> {
  const { staleTime = DEFAULT_STALE_TIME, initialData, skip = false, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(initialData ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!initialData && !skip);
  const [isValidating, setIsValidating] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const fetchData = useCallback(async () => {
    if (skip) return;

    const cached = cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < staleTime) {
      setData(cached.data as T);
      setIsLoading(false);
      return;
    }

    const pending = pendingRequests.get(key);
    if (pending) {
      setIsValidating(true);
      try {
        const result = (await pending) as T;
        setData(result);
        setError(null);
        onSuccessRef.current?.(result);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        onErrorRef.current?.(e);
      } finally {
        setIsLoading(false);
        setIsValidating(false);
      }
      return;
    }

    if (cached) {
      setData(cached.data as T);
      setIsLoading(false);
      setIsValidating(true);
    } else {
      setIsLoading(true);
    }

    const request = fetcher();
    pendingRequests.set(key, request);

    try {
      const result = await request;
      cache.set(key, { data: result, timestamp: Date.now() });
      cleanCache();
      setData(result);
      setError(null);
      onSuccessRef.current?.(result);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      onErrorRef.current?.(e);
    } finally {
      pendingRequests.delete(key);
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [key, fetcher, staleTime, skip]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mutate = useCallback(
    (newData?: T | ((prev: T | null) => T)) => {
      if (newData === undefined) {
        fetchData();
        return;
      }
      const resolved =
        typeof newData === 'function' ? (newData as (prev: T | null) => T)(data) : newData;
      setData(resolved);
      cache.set(key, { data: resolved, timestamp: Date.now() });
    },
    [data, key, fetchData],
  );

  return { data, error, isLoading, isValidating, mutate, refetch: fetchData };
}

/**
 * Re-fetches when any dependency changes. Cache key is derived from deps.
 */
export function useFetchWithDeps<T>(
  deps: unknown[],
  fetcher: () => Promise<T>,
  options: UseFetchOptions<T> = {},
): UseFetchResult<T> {
  const key = JSON.stringify(deps);
  return useFetch(key, fetcher, options);
}

/**
 * Invalidate cache entries by prefix or substring.
 * Call after a mutation to force re-fetches.
 */
export function invalidateCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix) || key.includes(`"${prefix}"`)) {
      cache.delete(key);
    }
  }
}

export function clearCache() {
  cache.clear();
}
