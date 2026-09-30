import { withTimeout } from './withTimeout';

// Supabase caps a select at 1000 rows by default, so larger tables must be read in pages.
export const FETCH_PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: unknown };

// Stops on an empty page rather than a short one, so a lower server-side row cap can't truncate silently.
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number, signal: AbortSignal) => PromiseLike<PageResult<T>>,
  pageSize: number = FETCH_PAGE_SIZE
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const from = rows.length;
    const { data, error } = await withTimeout((signal) => fetchPage(from, from + pageSize - 1, signal));
    if (error) throw error;
    const page = data ?? [];
    if (page.length === 0) return rows;
    rows.push(...page);
  }
}

export const PAGE_SIZES = [15, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface PageWindow {
  page: number;      // 1-based, clamped to the available pages
  pageCount: number; // at least 1
  start: number;     // 1-based index of the first item shown, 0 when empty
  end: number;
  total: number;
}

export function pageRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (Math.max(1, Math.floor(page)) - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function pageWindow(page: number, pageSize: number, total: number, shown: number): PageWindow {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page)), pageCount);
  const offset = (current - 1) * pageSize;
  return {
    page: current,
    pageCount,
    start: shown === 0 ? 0 : offset + 1,
    end: offset + shown,
    total,
  };
}
