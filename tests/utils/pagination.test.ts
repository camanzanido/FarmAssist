import { fetchAllRows, pageRange, pageWindow } from '../../src/utils/pagination';

function fakeTable(size: number, serverCap = Infinity) {
  const rows = Array.from({ length: size }, (_, i) => i);
  const calls: [number, number][] = [];
  const fetchPage = async (from: number, to: number) => {
    calls.push([from, to]);
    const end = Math.min(to + 1, from + serverCap);
    return { data: rows.slice(from, end), error: null };
  };
  return { rows, calls, fetchPage };
}

describe('fetchAllRows', () => {
  it('reads past the 1000-row cap in pages', async () => {
    const t = fakeTable(2500);
    const out = await fetchAllRows(t.fetchPage, 1000);
    expect(out).toEqual(t.rows);
    expect(t.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999], [2500, 3499]]);
  });

  it('still gets everything when the server caps pages lower than requested', async () => {
    const t = fakeTable(250, 100);
    expect(await fetchAllRows(t.fetchPage, 1000)).toEqual(t.rows);
  });

  it('returns an empty list for an empty table', async () => {
    const t = fakeTable(0);
    expect(await fetchAllRows(t.fetchPage, 1000)).toEqual([]);
  });

  it('throws the page error', async () => {
    const boom = new Error('permission denied');
    await expect(fetchAllRows(async () => ({ data: null, error: boom }))).rejects.toBe(boom);
  });
});

describe('pageRange', () => {
  it('maps a 1-based page to inclusive row offsets', () => {
    expect(pageRange(1, 15)).toEqual({ from: 0, to: 14 });
    expect(pageRange(3, 25)).toEqual({ from: 50, to: 74 });
  });

  it('treats page 0 or below as the first page', () => {
    expect(pageRange(0, 15)).toEqual({ from: 0, to: 14 });
  });
});

describe('pageWindow', () => {
  it('describes a middle page', () => {
    expect(pageWindow(2, 20, 45, 20)).toEqual({ page: 2, pageCount: 3, start: 21, end: 40, total: 45 });
  });

  it('describes a short last page', () => {
    expect(pageWindow(3, 20, 45, 5)).toMatchObject({ start: 41, end: 45 });
  });

  it('clamps a page that no longer exists, e.g. after a delete or a narrower filter', () => {
    expect(pageWindow(3, 20, 5, 0)).toMatchObject({ page: 1, pageCount: 1 });
    expect(pageWindow(0, 20, 45, 20).page).toBe(1);
  });

  it('reports one empty page for no rows', () => {
    expect(pageWindow(1, 15, 0, 0)).toEqual({ page: 1, pageCount: 1, start: 0, end: 0, total: 0 });
  });
});
