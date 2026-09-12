import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

export function useResearcherFetch<T>(fetchFn: () => Promise<T>, initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const hasLoadedOnce = useRef(false);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const load = useCallback(async () => {
    if (!hasLoadedOnce.current) setIsLoading(true);
    try {
      const result = await fetchRef.current();
      setData(result);
      setError(false);
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error('Failed to load researcher data:', err);
      // Only surface the error screen on the first load — a failed
      // background refresh should leave whatever data is already shown.
      if (!hasLoadedOnce.current) setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { data, isLoading, error, reload: load };
}
