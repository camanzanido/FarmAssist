import type { PagedRows } from '@/src/database/repositories/researcher';
import { PAGE_SIZES, pageWindow, type PageSize } from '@/src/utils/pagination';
import { isStale } from '@/src/utils/staleness';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type FetchPage<T, F> = (params: F & { page: number; pageSize: number }) => Promise<PagedRows<T>>;

type LoadMode = 'page' | 'silent';

export function useResearcherPage<T, F extends object>(fetchPage: FetchPage<T, F>, filters: F) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(PAGE_SIZES[0]);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const hasLoadedOnce = useRef(false);
  const lastLoadedAt = useRef<number | null>(null);
  const requestId = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const filterKey = JSON.stringify(filters);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async (target: number, size: number, mode: LoadMode) => {
    const id = ++requestId.current;
    if (hasLoadedOnce.current && mode === 'page') setIsPageLoading(true);
    try {
      const result = await fetchRef.current({ ...filtersRef.current, page: target, pageSize: size });
      if (id !== requestId.current) return;
      const lastPage = Math.max(1, Math.ceil(result.total / size));
      if (result.rows.length === 0 && target > lastPage) {
        setPage(lastPage);
        return;
      }
      setRows(result.rows);
      setTotal(result.total);
      setError(false);
      hasLoadedOnce.current = true;
      lastLoadedAt.current = Date.now();
    } catch (err) {
      if (id !== requestId.current) return;
      console.error('Failed to load researcher page:', err);
      if (!hasLoadedOnce.current) setError(true);
    } finally {
      if (id === requestId.current) {
        setIsLoading(false);
        setIsPageLoading(false);
      }
    }
  }, []);

  const pageRef = useRef(page);
  pageRef.current = page;
  const sizeRef = useRef(pageSize);
  sizeRef.current = pageSize;

  const lastQuery = useRef<string | null>(null);
  useEffect(() => {
    const queryKey = `${filterKey}|${pageSize}`;
    const isFirst = lastQuery.current === null;
    const queryChanged = !isFirst && lastQuery.current !== queryKey;
    lastQuery.current = queryKey;
    if (isFirst) return;
    if (queryChanged && page !== 1) {
      setPage(1);
      return;
    }
    load(page, pageSize, 'page');
  }, [page, pageSize, filterKey, load]);

  useFocusEffect(useCallback(() => {
    if (isStale(lastLoadedAt.current, Date.now())) load(pageRef.current, sizeRef.current, 'silent');
  }, [load]));

  const reload = useCallback(() => load(pageRef.current, sizeRef.current, 'silent'), [load]);
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load(pageRef.current, sizeRef.current, 'silent');
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);
  const retry = useCallback(() => {
    setIsLoading(true);
    setError(false);
    return load(pageRef.current, sizeRef.current, 'silent');
  }, [load]);

  const pageInfo = useMemo(() => pageWindow(page, pageSize, total, rows.length), [page, pageSize, total, rows.length]);

  return {
    rows, pageInfo, pageSize, isLoading, isPageLoading, isRefreshing, error,
    setPage, setPageSize, reload, refresh, retry,
  };
}
