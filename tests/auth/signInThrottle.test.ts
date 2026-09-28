import {
  attemptsBeforeLock,
  BASE_LOCK_MS,
  formatLockTime,
  INITIAL_THROTTLE,
  MAX_LOCK_MS,
  parseThrottle,
  recordFailure,
  remainingLockMs,
  ThrottleState,
} from '../../src/auth/signInThrottle';

const T0 = 1_000_000;

function fail(times: number, now = T0): ThrottleState {
  let s = INITIAL_THROTTLE;
  for (let i = 0; i < times; i++) s = recordFailure(s, now);
  return s;
}

describe('sign-in throttle', () => {
  it('allows four wrong attempts without a lock', () => {
    const s = fail(4);
    expect(remainingLockMs(s, T0)).toBe(0);
    expect(attemptsBeforeLock(s)).toBe(1);
  });

  it('locks for 30 seconds on the fifth wrong attempt', () => {
    const s = fail(5);
    expect(remainingLockMs(s, T0)).toBe(BASE_LOCK_MS);
    expect(remainingLockMs(s, T0 + BASE_LOCK_MS)).toBe(0);
  });

  it('doubles the lock for each further wrong attempt, capped at 15 minutes', () => {
    expect(remainingLockMs(fail(6), T0)).toBe(60_000);
    expect(remainingLockMs(fail(7), T0)).toBe(120_000);
    expect(remainingLockMs(fail(20), T0)).toBe(MAX_LOCK_MS);
  });

  it('formats the remaining time as m:ss, rounding up', () => {
    expect(formatLockTime(30_000)).toBe('0:30');
    expect(formatLockTime(29_001)).toBe('0:30');
    expect(formatLockTime(125_000)).toBe('2:05');
  });

  it('restores a saved state and ignores corrupt storage', () => {
    const s = fail(6);
    expect(parseThrottle(JSON.stringify(s))).toEqual(s);
    expect(parseThrottle(null)).toEqual(INITIAL_THROTTLE);
    expect(parseThrottle('not json')).toEqual(INITIAL_THROTTLE);
    expect(parseThrottle('{"failures":"x"}')).toEqual(INITIAL_THROTTLE);
  });
});
