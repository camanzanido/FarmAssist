import { isStale } from '@/src/utils/staleness';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

export function useResearcherFetch<T>(fetchFn: () => Promise<T>, initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const hasLoadedOnce = useRef(false);
  const lastLoadedAt = useRef<number | null>(null);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const load = useCallback(async () => {
    if (!hasLoadedOnce.current) setIsLoading(true);
    try {
      const result = await fetchRef.current();
      setData(result);
      setError(false);
      hasLoadedOnce.current = true;
      lastLoadedAt.current = Date.now();
    } catch (err) {
      console.error('Failed to load researcher data:', err);
      if (!hasLoadedOnce.current) setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load();
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  useFocusEffect(useCallback(() => {
    if (isStale(lastLoadedAt.current, Date.now())) load();
  }, [load]));

  return { data, isLoading, isRefreshing, error, reload: load, refresh };
}
