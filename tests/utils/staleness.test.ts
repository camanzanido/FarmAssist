import { FOCUS_STALE_MS, isStale } from '../../src/utils/staleness';

describe('isStale', () => {
  const now = 1_000_000;

  it('treats data that never loaded as stale', () => {
    expect(isStale(null, now)).toBe(true);
  });

  it('keeps data fresh inside the window', () => {
    expect(isStale(now - FOCUS_STALE_MS + 1, now)).toBe(false);
  });

  it('marks data stale once the window has passed', () => {
    expect(isStale(now - FOCUS_STALE_MS, now)).toBe(true);
    expect(isStale(now - 5_000, now, 5_000)).toBe(true);
  });
});
